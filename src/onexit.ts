import { ChildProcess } from "child_process"
import { readableToString } from "@rauschma/stringio"

export async function onExit(cp: ChildProcess) {
	return new Promise(async (resolve, reject) => {
		cp.once("exit", async (code, _) => {
			if (code === 0) resolve(undefined)
			else if (cp.stderr !== null) {
				const errorOutput = await readableToString(cp.stderr)
				reject(new Error(`Exit with error code: ${code}\n` + errorOutput))
			} else {
				reject(new Error(`Exit with error code: ${code}`))
			}
		})
		cp.once("error", async (err) => {
			if (cp.stderr !== null) {
				const errorOutput = await readableToString(cp.stderr)
				reject(`${err.name}: ${err.message}\n` + errorOutput)
			} else {
				reject(err)
			}
		})
	})
}
