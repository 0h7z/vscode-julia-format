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

# import JuliaFormatter.valid_for_in_op; valid_for_in_op(s::String) = s ∈ split(raw"${for_in_op}", ' ')
import JuliaFormatter.valid_for_in_op
valid_for_in_op(s::String) = s ∈ split(raw"${for_in_op}", ' ')

using JuliaFormatter
const throw_parse_error(file, x) =
	x.head == :toplevel && for (i, ex) ∈ pairs(x.args)
		ex isa Expr && ex.head ∈ (:error, :incomplete) || continue
		line, info = x.args[i-1].line, replace(join(ex.args, ", "), '"' => '\`')
		throw(Meta.ParseError("$file:$line: $info"))
	end
const text = read(stdin, String)
const path = strip(raw" ${path} ")
throw_parse_error(path, Meta.parseall(text, filename = basename(path)))
print(format_text(text; ${flag}))

