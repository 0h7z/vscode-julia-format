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

using JuliaFormatter
JuliaFormatter.valid_for_in_op(s::String) = s ∈ split(raw""" ${for_in_op} """)

const throw_parse_error(f, p) =
	p.head == :toplevel && for (i, x) ∈ enumerate(p.args)
		x isa Expr && x.head ∈ (:error, :incomplete) || continue
		l = p.args[i-1]
		@static if VERSION < v"1.10"
			i = replace(join(x.args, ", "), '"' => '\`')
			e = "ParseError:\n$l\n" .* x.args
		else
			i = x.args[1].detail.diagnostics[1].message
			e = sprint.(showerror, x.args)
		end
		n = l.line
		println.(e .* "\n")
		throw(Meta.ParseError("$f:$n: $i"))
	end
const text, path = read(stdin, String), strip(raw""" ${path} """)
throw_parse_error(path, Meta.parseall(text, filename = basename(path)))
print(format_text(text; ${flag}))

