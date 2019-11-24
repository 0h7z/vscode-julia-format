# From https://github.com/julia-actions/julia-format/blob/d9cea40/format.jl#L23-L114
using JuliaFormatter

help = """
JuliaFormatter formats Julia (.jl) programs. The formatter is width-sensitive.
Without an explicit file or path, this help message is written to stdout.
Given a file, it operates on that file; given a directory, it operates on
all .jl files in that directory, recursively (Files starting with a nofmt comment are ignored).
By default, JuliaFormatter overwrites files with the reformatted source.
Usage:
    format.jl [flags] [path ...]
Flags:
    -i, --indent
        The number of spaces used for an indentation.
    -m, --margin
        The maximum number of characters of code on a single line.  Lines over the
        limit will be wrapped if possible. There are cases where lines cannot be wrapped
        and they will still end up wider than the requested margin.
    -v, --verbose
        Print the name of the files being formatted with relevant details.
    -h, --help
        Print this message.
    -o, --overwrite
        Writes the formatted source to a new file where the original
        filename is suffixed with _fmt, i.e. `filename_fmt.jl`.
    --always_for_in
        Always replaces `=` with `in` for `for` loops.
        For example, `for i = 1:10` will be transformed to `for i in 1:10`.
"""

function parse_opts!(args::Vector{String})
    i = 1
    opts = Dict{Symbol,Union{Int,Bool}}()
    while i ≤ length(args)
        arg = args[i]
        if arg[1] != '-'
            i += 1
            continue
        end
        if arg == "-i" || arg == "--indent"
            opt = :indent
        elseif arg == "-m" || arg == "--margin"
            opt = :margin
        elseif arg == "-v" || arg == "--verbose"
            opt = :verbose
        elseif arg == "-h" || arg == "--help"
            opt = :help
        elseif arg == "-o" || arg == "--overwrite"
            opt = :overwrite
        elseif arg == "--always_for_in"
            opt = :always_for_in
        else
            error("invalid option $arg")
        end
        if opt in (:verbose, :help, :always_for_in)
            opts[opt] = true
            deleteat!(args, i)
        elseif opt == :overwrite
            opts[opt] = false
            deleteat!(args, i)
        else
            i < length(args) || error("option $arg requires and argument")
            val = tryparse(Int, args[i+1])
            val != nothing || error("invalid value for option $arg: $(args[i+1])")
            opts[opt] = val
            deleteat!(args, i:i+1)
        end
    end
    return opts
end

opts = parse_opts!(ARGS)
if isempty(ARGS) || haskey(opts, :help)
    write(stdout, help)
    # for the purposes of the action this
    # will count as a failure
    exit(1)
end
format(ARGS; opts...)

out = Cmd(`git diff --name-only`) |> read |> String
if out == ""
    exit(0)
else
    @error "Some files have not been formatted !!!"
    write(stdout, out)
    exit(1)
end
