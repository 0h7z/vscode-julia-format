import { readableToString } from "@rauschma/stringio"
import type { ChildProcess } from "child_process"
import type { OutputChannel } from "vscode"

export async function onExit(cp: ChildProcess, ch: OutputChannel) {
	return new Promise(async (resolve, reject) => {
		cp.once("exit", async (code, _) => {
			const msg = `[Process exited with code ${code}]`
			if (code === 0) {
				return resolve(msg)
			}
			if (cp.stderr !== null) {
				ch.appendLine(msg)
				reject(await readableToString(cp.stderr))
			} else {
				reject(msg)
			}
		})
		cp.once("error", async (err) => {
			const msg = `${err.name}: ${err.message}`
			if (cp.stderr !== null) {
				ch.appendLine(msg)
				reject(await readableToString(cp.stderr))
			} else {
				reject(msg)
			}
		})
	})
}
