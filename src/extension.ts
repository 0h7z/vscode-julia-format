import * as vscode from "vscode"
import * as util from "util"
import * as cp from "child_process"
import * as diff from "diff"
import untildify = require("untildify")
import { streamWrite, streamEnd, readableToString } from "@rauschma/stringio"
import { onExit } from "./onexit"

export const promiseExec = util.promisify(cp.exec)
export let registration: vscode.Disposable | undefined

const progressBar: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -1)
progressBar.text = "Formatting..."

let outputChannel = vscode.window.createOutputChannel("Julia Formatter")

export async function getJulia(): Promise<string> {
	// From https://github.com/julia-vscode/julia-vscode/blob/dd94db5/src/settings.ts#L8-L14
	let section = vscode.workspace.getConfiguration("julia")
	let jlpath = section ? untildify(section.get<string>("executablePath", "julia")) : null
	if (jlpath === "") {
		jlpath = null
	}
	// From https://github.com/iansan5653/vscode-format-python-docstrings/blob/0135de8/src/extension.ts#L15-L45
	if (jlpath !== null) {
		try {
			await promiseExec(/\s/.test(jlpath) ? `"${jlpath}" --version` : `${jlpath} --version`)
			return jlpath
		} catch {
			vscode.window.showErrorMessage(`
			The Julia path set in the "julia.executablePath" setting is invalid. Check
			the value or clear the setting to use the global Julia installation.
			`)
		}
	}
	try {
		await promiseExec("julia --version")
		return "julia"
	} catch (err) {
		try {
			await promiseExec("jl --version")
			return "jl"
		} catch {
			vscode.window.showErrorMessage(`
			Julia is either not installed or not properly configured. Check that
			the Julia location is set in VSCode or provided in the system
			environment variables.
			`)
			throw err
		}
	}
}

// From https://github.com/iansan5653/vscode-format-python-docstrings/blob/0135de8/src/extension.ts#L54-L72
export async function buildFormatArgs(path: string): Promise<string[]> {
	const config = vscode.workspace.getConfiguration("julia-format")

	const args = config.get<string>("args") as string
	const flag = config.get<string>("flag") as string

	const cmdArgs = [
		args,
		"-e",
		`using JuliaFormatter
		function throw_parse_error(ex, file)
			ex.head ≠ :toplevel && return
			for (i, arg) in pairs(ex.args)
				(arg isa Expr && arg.head in [:error, :incomplete]) || continue
				line = ex.args[i-1].line
				info = replace(join(arg.args, ", "), '"' => '\`')
				throw(Meta.ParseError("$file:$line: $info"))
			end
		end
		const text = read(stdin, String)
		const path = replace(strip(strip(raw""" ${path} """), '"'), raw"\\\\" => '/')
		const expr = Meta.parseall(text, filename = basename(path))
		throw_parse_error(expr, occursin(r"^[a-z]:/", path) ? uppercasefirst(path) : path)
		print(format_text(text; ${flag}))
		`,
	]

	outputChannel.appendLine(`Running Julia with args: ${JSON.stringify(cmdArgs)}`)

	return cmdArgs
}

// From https://github.com/iansan5653/vscode-format-python-docstrings/blob/0135de8/src/extension.ts#L78-L90
export async function installFormatter(): Promise<void> {
	const julia = await getJulia()
	try {
		await promiseExec(`${julia} -e "using Pkg; Pkg.update(); Pkg.add(\\"JuliaFormatter\\")"`)
	} catch (err) {
		vscode.window.showErrorMessage(`
		Could not install JuliaFormatter automatically. Make sure that it
		is installed correctly and try manually installing with
		\` julia -e "using Pkg; Pkg.add(string(:JuliaFormatter))" \`.\n\nFull error: ${err}.
		`)
		throw err
	}
}

// From https://github.com/iansan5653/vscode-format-python-docstrings/blob/0135de8/src/extension.ts#L101-L132
export async function alertFormattingError(err: FormatException): Promise<void> {
	outputChannel.appendLine(err.message)

	if (err.message.includes("Package JuliaFormatter not found")) {
		const installButton = "Install Module"
		const response = await vscode.window.showErrorMessage(`The Julia package "JuliaFormatter" must be installed to format files.`, installButton)
		if (response === installButton) installFormatter()
	} else {
		const bugReportButton = "Submit Bug Report"
		const err_header_match = err.message.match(/^(ERROR:.*)/m)
		const err_body = err_header_match !== null ? err_header_match[1] : `Unknown Error: Could not format file. Full error:\n\n${err.message}`

		const response = await vscode.window.showErrorMessage(err_body, bugReportButton)
		if (response === bugReportButton) vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("https://github.com/0h7z/vscode-julia-format/issues/new"))
	}
}

// From https://github.com/iansan5653/vscode-format-python-docstrings/blob/0135de8/src/extension.ts#L142-L152
export async function format(path: string, content: string): Promise<diff.Hunk[]> {
	const julia = await getJulia()
	const args: string[] = await buildFormatArgs(path)

	progressBar.show()

	try {
		const tabSize = vscode.workspace.getConfiguration("julia-format").get<number>("tabs") as number
		const formatter = cp.spawn(julia, args)

		await streamWrite(formatter.stdin, content)
		await streamEnd(formatter.stdin)

		const formatted = await readableToString(formatter.stdout)
		const result = tabSize < 1 ? formatted : formatted.replace(new RegExp(" ".repeat(tabSize), "g"), "\t")

		// TODO: capture stderr output from JuliaFormatter on error
		await onExit(formatter)

		// It would be nicer if we could combine these two lines somehow
		const patch = diff.createPatch(path, content, result)
		const parsed: diff.ParsedDiff[] = diff.parsePatch(patch)
		return parsed[0].hunks
	} catch (e) {
		const err = <FormatException>e
		alertFormattingError(err)
		throw err
	} finally {
		progressBar.hide()
	}
}

// From https://github.com/iansan5653/vscode-format-python-docstrings/blob/0135de8/src/extension.ts#L159-L180
export function hunksToEdits(hunks: diff.Hunk[]): vscode.TextEdit[] {
	return hunks.map((hunk): vscode.TextEdit => {
		const startPos = new vscode.Position(hunk.oldStart - 1, 0)
		const endPos = new vscode.Position(hunk.oldStart - 1 + hunk.oldLines, 0)
		const editRange = new vscode.Range(startPos, endPos)

		const newTextFragments: string[] = []
		hunk.lines.forEach((line, i) => {
			const firstChar = line.charAt(0)
			// hunk.linedelimiters[i] should always exist, but you never know
			if (firstChar === " " || firstChar === "+") newTextFragments.push(line.substr(1), hunk.linedelimiters[i] ?? "\n")
		})
		const newText = newTextFragments.join("")

		return vscode.TextEdit.replace(editRange, newText)
	})
}

export function activate(context: vscode.ExtensionContext) {
	vscode.languages.registerDocumentFormattingEditProvider("julia", {
		async provideDocumentFormattingEdits(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
			const hunks = await format(document.fileName, document.getText())
			return hunksToEdits(hunks)
		},
	})
	outputChannel.appendLine("Initialized Julia Formatter extension")
}

export interface FormatException {
	message: string
}

// this method is called when your extension is deactivated
export function deactivate(): void {
	if (registration) {
		registration.dispose()
	}
}
