# Copyright (C) 2022-2024 Heptazhou <zhou@0h7z.com>
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, version 3.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

((d, f) -> isdir(d) && isfile(f) ? rm.((d, f), recursive = true) : error())("out/", "main.js")

const pkg = "vscode-julia-format"
const ext = ".vsix"
const ps  = pkg * raw"-(\d+\.\d+\.\d+)"
const pd  = pkg * raw"-v\1"
const src = Regex('^' * ps * escape_string(ext, '.') * '$')
const dst = SubstitutionString(pd * ext)

for f ∈ filter!(endswith(ext), readdir())
	g = replace(f, src => dst)
	g ≠ f && mv(f, g, force = true)
end

