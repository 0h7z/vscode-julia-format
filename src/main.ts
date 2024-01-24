import { exec, spawn } from "child_process"
import { Hunk, structuredPatch } from "diff"
import { onExit } from "./onexit"
import { promisify } from "util"
import { readableToString, streamEnd, streamWrite } from "@rauschma/stringio"
import vscode from "vscode"

// @ts-expect-error
import untildify from "untildify"

export const promiseExec = promisify(exec)
export let registration: vscode.Disposable | undefined

let installingJlFmt = false
const vscodeOutput = vscode.window.createOutputChannel("Julia Formatter")
const progressBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -1)
progressBar.text = "Formatting..."

export async function getJulia(): Promise<string> {
	// https://github.com/julia-vscode/julia-vscode/blob/dd94db5/src/settings.ts#L8-L14
	const section = vscode.workspace.getConfiguration("julia")
	let jlpath = section ? untildify(section.get<string>("executablePath", "julia")) : null
	if (jlpath === "") {
		jlpath = null
	}
	// https://github.com/iansan5653/vscode-format-python-docstrings/blob/0135de8/src/extension.ts#L15-L45
	if (jlpath !== null) {
		try {
			await promiseExec(`${jlpath} --version`)
			return jlpath
		} catch {
			vscode.window.showErrorMessage(`The Julia path set in the "julia.executablePath" setting is invalid. Check the value or clear the setting to use the global Julia installation.`)
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
			vscode.window.showErrorMessage(`Julia is either not installed or not properly configured. Check that the Julia location is set in VSCode or provided in the system environment variables.`)
			throw err
		}
	}
}

// https://github.com/iansan5653/vscode-format-python-docstrings/blob/0135de8/src/extension.ts#L54-L72
export async function buildFormatArgs(path: string): Promise<string[]> {
	const config = vscode.workspace.getConfiguration("julia-format")

	const args = <string>config.get("args")
	const flag = <string>config.get("flag")
	const inop = <string>config.get("inop")
	const expr = `
	const throw_parse_error(f, p) =
		p.head == :toplevel && for (i, x) ∈ enumerate(p.args)
			x isa Expr && x.head ∈ (:error, :incomplete) || continue
			l = p.args[i-1]
			@static if VERSION < v"1.10"
				i = replace(join(x.args, ", "), '"' => '\`')
				e = "ParseError:\n$l\n" .* x.args
			else
				i = x.args[1].detail.diagnostics[1].message
				e = sprint.(showerror, x.args)
			end
			n = l.line
			println.(e .* "\n")
			throw(Meta.ParseError("$f:$n: $i"))
		end
	const text, path = read(stdin, String), strip(raw""" ${path} """)
	throw_parse_error(path, Meta.parseall(text, filename = basename(path)))
	print(format_text(text; ${flag}))
	` // main.jl

	const for_in_op = inop.trim().replace(/ +/g, " ")
	const args_list = [
		...args.split(/(?<!\\) /).filter((s) => s !== ""),
		"-e",
		`using JuliaFormatter` +
		( for_in_op === "" ? "" : "\n" +
		`JuliaFormatter.valid_for_in_op(s::String) = s ∈ split(raw""" ${for_in_op} """)` )
		+ expr, // prettier-ignore
	]

	vscodeOutput.appendLine(`Running Julia with args: ${JSON.stringify(args_list)}`)

	return args_list
}

// https://github.com/iansan5653/vscode-format-python-docstrings/blob/0135de8/src/extension.ts#L78-L90
export async function installFormatter(): Promise<void> {
	const julia = await getJulia()
	try {
		await promiseExec(`${julia} -e "using Pkg; Pkg.Registry.update(); Pkg.add(\\"JuliaFormatter\\"); Pkg.update(\\"JuliaFormatter\\")"`)
	} catch (err) {
		vscode.window.showErrorMessage(`Could not install JuliaFormatter automatically. Try manually installing with \` julia -e "using Pkg; Pkg.update(); Pkg.add(string(:JuliaFormatter))" \`.\n\nFull error: ${err}.`)
		throw err
	}
}

// https://github.com/iansan5653/vscode-format-python-docstrings/blob/0135de8/src/extension.ts#L101-L132
export async function alertFormattingError(error: FormatException): Promise<void> {
	const err = error.message
	vscodeOutput.appendLine(err)

	if (
		err.includes("ERROR: ArgumentError: Package JuliaFormatter not found") ||
		err.includes("ERROR: MethodError: no method matching JuliaFormatter.Options") ||
		err.includes("ERROR: UndefVarError: `valid_for_in_op` not defined") //
	) {
		const installButton = "Install Module"
		const response = await vscode.window.showErrorMessage(`The Julia package "JuliaFormatter" must be installed to format code. Installation will take some time.`, installButton)
		if (response !== installButton) return
		let progress = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -1)
		try {
			installingJlFmt = true
			progress.text = "Installing JuliaFormatter..."
			progress.show()
			await installFormatter()
		} finally {
			installingJlFmt = false
			progress.dispose()
		}
	} else if (
		err.includes("ERROR: Base.Meta.ParseError") ||
		err.includes("ERROR: ParseError") //
	) {
		const button = "Detail"
		const err_header_match = err.match(/(?:^|\n)(ERROR:.*?)\s*Stacktrace:/s)
		const err_body = err_header_match !== null ? err_header_match[1] : err

		const response = await vscode.window.showErrorMessage(err_body, button)
		if (response === button) vscode.workspace.openTextDocument({ content: error.cause ?? err, language: "plaintext" }).then((doc) => vscode.window.showTextDocument(doc))
	} else {
		const button = "Submit Bug Report"
		const err_header_match = err.match(/^(ERROR:.*)/m)
		const err_body = err_header_match !== null ? err_header_match[1] : `Unknown Error: Could not format code. Full error:\n\n${err}`

		const response = await vscode.window.showErrorMessage(err_body, button)
		if (response === button) vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("https://github.com/0h7z/vscode-julia-format/issues/new"))
	}
}

// https://github.com/iansan5653/vscode-format-python-docstrings/blob/0135de8/src/extension.ts#L142-L152
export async function format(path: string, content: string): Promise<Hunk[]> {
	const julia = await getJulia()
	const args: string[] = await buildFormatArgs(vscode.workspace.asRelativePath(path).replace(/\\/g, "/"))

	progressBar.show()

	try {
		const tabSize = <number>vscode.workspace.getConfiguration("julia-format").get("tabs")
		const formatter = spawn(julia, args)
		const tabToSpace = (s: string): string => {
			const r = RegExp("^(\t*)\t(?!⋮$)", "mg")
			while (r.test(s)) s = s.replace(r, `$1${" ".repeat(tabSize)}`)
			return s
		}
		const spaceToTab = (s: string): string => {
			const r = RegExp(`^(\t*)${" ".repeat(tabSize)}(?!⋮$)`, "mg")
			while (r.test(s)) s = s.replace(r, "$1\t")
			return s
		}

		await streamWrite(formatter.stdin, tabToSpace(content))
		await streamEnd(formatter.stdin)

		const formatted = await readableToString(formatter.stdout)
		const result = tabSize >= 1 ? spaceToTab(formatted) : formatted

		try {
			await onExit(formatter)
		} catch (s) {
			throw new Error(<string>s, { cause: formatted })
		}

		const patch = structuredPatch(path, path, content, result)
		return patch.hunks
	} catch (e) {
		const err = <FormatException>e
		if (!installingJlFmt) alertFormattingError(err)
		throw err
	} finally {
		progressBar.hide()
	}
}

// https://github.com/iansan5653/vscode-format-python-docstrings/blob/0135de8/src/extension.ts#L159-L180
export function hunksToEdits(hunks: Hunk[]): vscode.TextEdit[] {
	return hunks.map((hunk): vscode.TextEdit => {
		const startPos = new vscode.Position(hunk.oldStart - 1, 0)
		const endPos = new vscode.Position(hunk.oldStart - 1 + hunk.oldLines, 0)
		const editRange = new vscode.Range(startPos, endPos)

		const newTextFragments: string[] = []
		hunk.lines.forEach((line) => {
			const firstChar = line.charAt(0)
			// https://github.com/kpdecker/jsdiff/pull/393
			if (firstChar === " " || firstChar === "+") newTextFragments.push(line.substring(1), "\n")
		})
		const newText = newTextFragments.join("")

		return vscode.TextEdit.replace(editRange, newText)
	})
}

export function activate() {
	registration = vscode.languages.registerDocumentFormattingEditProvider("julia", {
		async provideDocumentFormattingEdits(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
			const hunks = await format(document.fileName, document.getText())
			return hunksToEdits(hunks)
		},
	})
	vscodeOutput.appendLine("Initialized Julia Formatter extension")
	format("", "")
}

export interface FormatException extends Error {
	cause: string
}

// this method is called when your extension is deactivated
export function deactivate() {
	if (registration) {
		registration.dispose()
	}
}
