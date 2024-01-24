# Copyright (C) 2022-2024 Heptazhou <zhou@0h7z.com>
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

((d, f) -> write(f, replace(read(d * f, String), r"^\t+ *"m => "")))("out/", "main.js")

const dir = "node_modules/"
const mod = ["@rauschma/stringio", "diff", "untildify"]
const rex = r"\.(d\.ts|es6\.js|map|md)$|^(runtime\.js|tsconfig\.json)$"

for (prefix, ds, fs) ∈ walkdir(dir, topdown = false)
	(prefix) = replace(prefix, "\\" => "/")
	any(startswith.(prefix, dir .* mod)) && cd(prefix) do
		rm.(("test",), force = true, recursive = true)
		rm.(filter!(contains(rex), fs))
	end
end

