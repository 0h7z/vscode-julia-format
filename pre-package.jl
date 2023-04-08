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

((d, f) -> isfile(d * f) ? cp(d * f, f, force = true) : error())("out/", "main.js")

const dir = "node_modules/"
const ext = r"\.(es6\.js|map|md)"
const mod = ["@rauschma/stringio", "diff", "untildify", "util"]

for (prefix, ds, fs) ∈ walkdir(dir)
	prefix = replace(prefix, "\\" => "/")
	!any(startswith.(prefix, dir .* mod)) && continue
	cd(prefix) do
		rm.(filter!(endswith(ext), fs))
	end
end

