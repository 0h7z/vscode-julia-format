# Copyright (C) 2022-2025 Heptazhou <zhou@0h7z.com>
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

using Exts

((d, f) -> isdir(d) && isfile(f) ? rm.((d, f), recursive = true) : error())("out/", "main.js")

for f ∈ filter!(endswith(".vsix"), readdir())
	g = replace(f, r"-(\d+\.\d+\.\d+\.vsix)$" => s"-v\1")
	g ≠ f && mv(f, g, force = true)
end

