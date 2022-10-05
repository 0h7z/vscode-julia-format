# Copyright (C) 2022 Heptazhou <zhou@0h7z.com>
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

using JuliaFormatter
function throw_parse_error(ex, file)
	ex.head ≠ :toplevel && return
	for (i, arg) in pairs(ex.args)
		(arg isa Expr && arg.head in [:error, :incomplete]) || continue
		line = ex.args[i-1].line
		info = replace(join(arg.args, ", "), '"' => '\`')
		throw(Meta.ParseError("$file:$line: $info"))
	end
end
const text = read(stdin, String)
const path = replace(strip(strip(raw""" ${path} """), '"'), raw"\\\\" => '/')
const expr = Meta.parseall(text, filename = basename(path))
throw_parse_error(expr, occursin(r"^[a-z]:/", path) ? uppercasefirst(path) : path)
print(format_text(text; ${flag}))

