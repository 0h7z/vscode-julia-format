# Copyright (C) 2022-2023 Heptazhou <zhou@0h7z.com>
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

((d, f) -> isfile(f) && isdir(d) ? (rm(f), rm(d, recursive = true)) : error())("out/", "main.js")

const pkg = "vscode-julia-format"
const ext = ".vsix"
const ps  = "$pkg-" * raw"(\d+\.\d+\.\d+)"
const pd  = "$pkg-" * raw"v\1"
const src = Regex('^' * ps * escape_string(ext, '.') * '$')
const dst = SubstitutionString(pd * ext)

for f ∈ readdir()
	splitext(f)[2] == ext || continue
	g = replace(f, src => dst)
	g ≠ f && mv(f, g, force = true)
end

