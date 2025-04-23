# Copyright (C) 2022-2026 Heptazhou <zhou@0h7z.com>
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

const ps = [r"-(\d+\.\d+\.\d+\.vsix)$" => s"-v\1"]

((d, f) -> isdir(d) && isfile(f) ? rm.((d, f), recursive = true) : error())("out/", "main.cjs")

for f ∈ filter!(endswith(".vsix"), readdir())
	g = replace(f, ps...)
	g ≠ f && mv(f, g, force = true)
end

