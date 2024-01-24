import { ChildProcess } from "child_process"
import { readableToString } from "@rauschma/stringio"

export async function onExit(cp: ChildProcess) {
	return new Promise(async (resolve, reject) => {
		cp.once("exit", async (code, _) => {
			if (code === 0) resolve(undefined)
			else if (cp.stderr !== null) {
				const stderr = await readableToString(cp.stderr)
				reject(`Returned: exit code ${code}\n` + stderr)
			} else {
				reject(`Returned: exit code ${code}`)
			}
		})
		cp.once("error", async (err) => {
			if (cp.stderr !== null) {
				const stderr = await readableToString(cp.stderr)
				reject(`${err.name}: ${err.message}\n` + stderr)
			} else {
				reject(`${err}`)
			}
		})
	})
}
