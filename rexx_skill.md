下面是一份可以直接放进 Copilot/Agent 本地可读目录的 **REXX on z/OS / MVS 编写 Skill 草案**。我按“给 Agent 看的规则文件”来写，语气偏指令化，里面包含设计原则、编码规则、反模式、推荐模板、参考代码和本地资料索引占位符。你可以把路径、公司标准、DD 名、HLQ 等替换成你自己的。

另外我也查了一些 IBM 官方资料入口：IBM 的 **z/OS TSO/E REXX User’s Guide** 说明 TSO/E REXX 是 MVS 上的 REXX 实现，并包含函数、I/O、TSO/E 外部函数、数据栈、不同地址空间运行等内容；IBM 的 **EXECIO** 文档明确说明 EXECIO 可用于 TSO/E 和非 TSO/E 地址空间，并给出了逐条读取和 EOF 处理示例；IBM 的 **sleep syscall** 文档说明 USS callable service `sleep` 用于挂起调用线程，并可能因调度或信号导致实际等待时间变化。你可以把这些 IBM 页面/PDF 下载到本地给 Agent 参考。([ibm.com](https://www.ibm.com/docs/en/zos/3.2.0?topic=tsoe-zos-rexx-users-guide&utm_source=openai))

---

```markdown
# Skill: Writing High-Quality REXX for z/OS / MVS

## Purpose

This skill defines how to write simple, reliable, maintainable REXX execs for z/OS / MVS environments.

The target environment is mainframe REXX, usually running as TSO/E REXX, batch TSO, ISPF-driven execs, or system utility scripts. Most REXX programs in this environment are operational scripts with one clear purpose, not large application frameworks.

The primary goal is:

- correctness,
- operational safety,
- predictable resource usage,
- simple readable flow,
- minimal unnecessary abstraction,
- clear error handling,
- low risk to system performance.

Do **not** over-engineer REXX execs.

---

## Local Reference Material

Before writing REXX code, read the local IBM manuals and site standards from the following directories.

> Update these paths for the local agent environment.

- `/path/to/local/ibm/zos/tsoe/rexx/reference/`
- `/path/to/local/ibm/zos/tsoe/rexx/users-guide/`
- `/path/to/local/ibm/zos/tsoe/commands/`
- `/path/to/local/ibm/zos/ispf/services/`
- `/path/to/local/ibm/zos/unix/rexx-syscall/`
- `/path/to/local/company/rexx-standards/`
- `/path/to/local/company/rexx-examples/`

Recommended IBM manuals to consult:

- z/OS TSO/E REXX Reference
- z/OS TSO/E REXX User's Guide
- z/OS TSO/E Command Reference
- z/OS ISPF Services Guide, if ISPF services are used
- z/OS UNIX System Services Command Reference, if SYSCALL is used
- z/OS MVS System Commands, only if issuing operator/system commands
- Site-specific REXX standards and examples

When in doubt, prefer IBM manuals and existing approved local code over generic internet examples.

---

## Core Philosophy

REXX on MVS should usually be written as a clear operational script.

Prefer this style:

1. Parse input.
2. Validate parameters and environment.
3. Allocate resources.
4. Process records in a controlled loop.
5. Handle errors immediately.
6. Close/free resources.
7. Print a concise summary.
8. Exit with a meaningful return code.

Avoid this style:

- many small `PROCEDURE` routines,
- deep call chains,
- unnecessary generic frameworks,
- excessive abstraction,
- object-oriented patterns,
- “enterprise application” structure,
- hidden variable scopes,
- clever dynamic variable tricks,
- unreadable meta-programming.

A good REXX exec should be readable by an operations programmer during an incident.

---

## General Coding Rules

### 1. Keep the program flat and linear

Use a mostly top-down script structure.

Preferred structure:

```rexx
/* REXX ***************************************************************/
/* Name:     SAMPLE                                                   */
/* Purpose:  Short clear purpose                                      */
/* Inputs:   DD INPUT, DD OUTPUT                                      */
/* Output:   Report written to DD OUTPUT                              */
/* RC:       0 OK, 4 warning/no data, 8 error, 12 severe error         */
/**********************************************************************/

signal on syntax name SyntaxTrap
signal on novalue name NovalueTrap
signal on halt   name HaltTrap

parse upper arg parm1 parm2 .

call Init
call ValidateInput
call Main
call Cleanup

exit rc
```

However, do **not** create a separate routine for every trivial operation. Routines are acceptable only for:

- initialization,
- cleanup,
- common error exit,
- repeated non-trivial logic,
- isolated risky operations,
- reusable local utility that materially improves clarity.

If a routine is used only once and is only 3-8 lines, usually inline it.

---

### 2. Avoid unnecessary `PROCEDURE`

REXX `PROCEDURE` creates a new variable scope. Overuse causes bugs because variables are no longer visible unless exposed.

Do not write code like this unless there is a strong reason:

```rexx
Sub1: procedure expose a b c d e f g
```

Avoid large `EXPOSE` lists. They are fragile.

Preferred:

- keep main variables in the main flow;
- use simple `CALL` labels without `PROCEDURE` when shared script state is intentional;
- use `PROCEDURE` only for pure utility functions with explicit arguments and return values.

Good use of `PROCEDURE`:

```rexx
IsBlank: procedure
  parse arg value
  return strip(value) = ''
```

Poor use of `PROCEDURE`:

```rexx
ProcessRecord: procedure expose in. out. count errFlag rc ddname options. stats.
  ...
```

If a routine requires exposing many variables, the routine probably should be inlined or redesigned.

---

### 3. Prefer built-in REXX functions

Use built-in functions instead of manual loops.

Commonly preferred built-ins:

- `STRIP`
- `WORD`
- `WORDS`
- `SUBSTR`
- `LEFT`
- `RIGHT`
- `POS`
- `LASTPOS`
- `TRANSLATE`
- `VERIFY`
- `DATATYPE`
- `LENGTH`
- `COPIES`
- `SPACE`
- `DELWORD`
- `WORDPOS`
- `ABBREV`
- `VALUE`
- `DATE`
- `TIME`
- `SIGNAL`
- `CONDITION`
- `SOURCELINE`

Examples:

```rexx
/* Good */
if datatype(maxLines, 'W') = 0 then do
  say 'ERROR: MAXLINES must be a whole number.'
  rc = 8
  signal Cleanup
end

/* Avoid manual digit checking unless needed */
```

```rexx
/* Good */
if pos('ERROR', translate(line)) > 0 then errCount = errCount + 1
```

---

### 4. Hardcode stable operational constants

In MVS REXX, many settings are site-specific and stable. Do not over-parameterize values that never change.

Acceptable hardcoding examples:

```rexx
readChunk  = 1000
maxErrors  = 100
inputDD    = 'INPUT'
outputDD   = 'OUTPUT'
reportDD   = 'REPORT'
jobPrefix  = 'ABC'
```

Do not create configuration parsers, JSON-like structures, or complex option frameworks unless the user explicitly requests them.

Use parameters only for values that genuinely vary by invocation.

---

### 5. Use meaningful return codes

Use consistent return codes:

- `0` = success
- `4` = warning, no data, or partial non-critical condition
- `8` = input, allocation, command, or processing error
- `12` = severe error or unsafe condition
- `16` = unexpected internal failure

Always set and preserve `rc`.

Avoid losing command return codes accidentally.

Example:

```rexx
address tso "ALLOC FI("inputDD") DA('"dsn"') SHR REUSE"
cmdRc = rc
if cmdRc <> 0 then do
  say 'ERROR: ALLOC failed for' dsn 'RC='cmdRc
  rc = 8
  signal Cleanup
end
```

---

## Error Handling Rules

### 1. Enable traps

Most production REXX execs should include:

```rexx
signal on syntax  name SyntaxTrap
signal on novalue name NovalueTrap
signal on halt    name HaltTrap
```

Use `NOVALUE` during development and for production scripts where undefined variables indicate a real bug.

Example:

```rexx
SyntaxTrap:
  say 'ERROR: REXX syntax failure.'
  say 'Condition:' condition('C')
  say 'Description:' condition('D')
  say 'Line:' sigl
  say sourceline(sigl)
  rc = 16
  signal Cleanup

NovalueTrap:
  say 'ERROR: Uninitialized variable.'
  say 'Condition:' condition('C')
  say 'Description:' condition('D')
  say 'Line:' sigl
  say sourceline(sigl)
  rc = 16
  signal Cleanup

HaltTrap:
  say 'ERROR: Execution interrupted by user or system.'
  rc = 12
  signal Cleanup
```

---

### 2. Check every important host command

Every important `ADDRESS TSO`, `ADDRESS ISPEXEC`, `ADDRESS MVS`, `ADDRESS SYSCALL`, or external command must check `RC`.

Bad:

```rexx
address tso "LISTDS '"dsn"'"
```

Good:

```rexx
address tso "LISTDS '"dsn"'"
cmdRc = rc
if cmdRc <> 0 then do
  say 'ERROR: LISTDS failed for' dsn 'RC='cmdRc
  rc = 8
  signal Cleanup
end
```

---

### 3. Cleanup must be safe and idempotent

Cleanup code must be safe even if initialization failed halfway.

Track whether resources were allocated/opened.

Example:

```rexx
Cleanup:
  if inputOpen = 1 then do
    address tso "EXECIO 0 DISKR" inputDD "(FINIS"
    inputOpen = 0
  end

  if outputOpen = 1 then do
    address tso "EXECIO 0 DISKW" outputDD "(FINIS"
    outputOpen = 0
  end

  if inputAlloc = 1 then do
    address tso "FREE FI("inputDD")"
    inputAlloc = 0
  end

  exit rc
```

---

## File I/O Rules

### 1. Do not read large files with `EXECIO * DISKR`

Avoid this pattern for unknown or large input:

```rexx
"EXECIO * DISKR INPUT (STEM IN. FINIS"
```

This can consume excessive storage and harm performance.

Preferred pattern: read in chunks, usually 1000 records at a time.

```rexx
readChunk = 1000
eof       = 0
totalRead = 0

do while eof = 0
  drop in.
  address tso "EXECIO" readChunk "DISKR INPUT (STEM IN."
  ioRc = rc

  select
    when ioRc = 0 then nop
    when ioRc = 2 then eof = 1
    otherwise do
      say 'ERROR: EXECIO DISKR failed. RC='ioRc
      rc = 8
      signal Cleanup
    end
  end

  if in.0 > 0 then do i = 1 to in.0
    line = in.i
    totalRead = totalRead + 1

    /* Process one input record here */

  end
end

address tso "EXECIO 0 DISKR INPUT (FINIS"
```

Notes:

- Always check `in.0`.
- Always close the file with `FINIS` when done.
- Use `DROP in.` before each chunk to avoid stale stem values.
- Do not assume `in.1` exists when `in.0 = 0`.
- Use fixed chunk sizes unless there is a proven need to tune.

---

### 2. Write output in batches

Do not issue one `EXECIO 1 DISKW` for every single output line unless output is tiny.

Accumulate a reasonable batch and write it.

Example:

```rexx
out. = ''
out.0 = 0
outLimit = 1000

call AddOut 'Report header'
call AddOut copies('-', 72)

/* later in processing */
call AddOut resultLine

if out.0 >= outLimit then call FlushOut

...

call FlushOut
address tso "EXECIO 0 DISKW OUTPUT (FINIS"
```

Helper:

```rexx
AddOut:
  parse arg outLine
  out.0 = out.0 + 1
  out.out.0 = outLine
  return

FlushOut:
  if out.0 = 0 then return
  address tso "EXECIO" out.0 "DISKW OUTPUT (STEM OUT."
  ioRc = rc
  if ioRc <> 0 then do
    say 'ERROR: EXECIO DISKW failed. RC='ioRc
    rc = 8
    signal Cleanup
  end
  drop out.
  out. = ''
  out.0 = 0
  return
```

This is one of the few cases where small local helper labels are justified.

---

### 3. Prefer DD names for operational scripts

When possible, use JCL DD statements or pre-allocated DD names.

Preferred:

```rexx
inputDD = 'INPUT'
address tso "EXECIO 1000 DISKR" inputDD "(STEM IN."
```

Avoid unnecessary dynamic allocation if the JCL or caller already provides DD names.

Use dynamic allocation only when the script truly owns allocation.

---

### 4. If dynamically allocating, free what you allocate

Example:

```rexx
inputAlloc = 0
inputDD    = 'INPUT'

address tso "ALLOC FI("inputDD") DA('"dsn"') SHR REUSE"
cmdRc = rc
if cmdRc <> 0 then do
  say 'ERROR: ALLOC failed for' dsn 'RC='cmdRc
  rc = 8
  signal Cleanup
end
inputAlloc = 1
```

Cleanup:

```rexx
if inputAlloc = 1 then do
  address tso "FREE FI("inputDD")"
  inputAlloc = 0
end
```

---

## Waiting / Sleep Rules

Do not use inefficient busy-wait loops.

Bad:

```rexx
do i = 1 to 10000000
end
```

Do not use ad-hoc time polling loops unless required.

Preferred, where z/OS UNIX SYSCALL environment is available:

```rexx
address syscall 'sleep 5'
sleepRc = rc
if sleepRc <> 0 then do
  say 'WARNING: SYSCALL sleep returned RC='sleepRc
end
```

If the environment requires syscall initialization, use the site-approved initialization pattern from local documentation or existing examples.

Example placeholder:

```rexx
/* Site-specific: initialize SYSCALL environment if required */
/* call syscall_init or use address syscall according to local standard */
```

Always confirm the target execution environment supports `ADDRESS SYSCALL`.

If SYSCALL is not available, use the approved local alternative. Do not invent CPU-consuming wait loops.

---

## Command Environment Rules

### 1. Be explicit with `ADDRESS`

Do not assume the current command environment.

Preferred:

```rexx
address tso     "EXECIO 1000 DISKR INPUT (STEM IN."
address ispexec "VGET (ZUSER) SHARED"
address syscall "sleep 10"
```

If issuing many commands to one environment:

```rexx
address tso
"ALLOC FI(INPUT) DA('"dsn"') SHR REUSE"
cmdRc = rc
```

But be careful when switching environments. Avoid long sections where the active environment is unclear.

---

### 2. Quote dataset names carefully

Dataset names should usually be quoted for TSO commands.

Example:

```rexx
dsn = strip(dsn)
address tso "LISTDS '"dsn"'"
```

Avoid accidental prefixing by TSO profile.

---

### 3. Avoid unnecessary parsing of command text output

If a TSO/E external function or ISPF service provides structured information, prefer it over parsing human-readable command output.

Examples:

- Prefer `LISTDSI()` for dataset attributes where suitable.
- Prefer ISPF services for ISPF table/profile tasks.
- Prefer SDSF REXX interface if approved and available, rather than scraping panels.

---

## Variable Rules

### 1. Use clear variable names

Good:

```rexx
inputDD
outputDD
readChunk
totalRead
errorCount
warningCount
memberName
jobName
```

Bad:

```rexx
a
b
x1
tmp2
flag3
```

Short loop indexes like `i`, `j` are acceptable.

---

### 2. Initialize variables explicitly

Do not rely on undefined variables becoming their own uppercase names.

Good:

```rexx
rc           = 0
eof          = 0
inputOpen    = 0
inputAlloc   = 0
totalRead    = 0
errorCount   = 0
warningCount = 0
```

Use `SIGNAL ON NOVALUE` to catch mistakes.

---

### 3. Use stems simply

Good:

```rexx
in.0 = 0
out.0 = 0
```

Avoid complex dynamic variable naming unless there is no simpler option.

Use:

```rexx
counts.key = counts.key + 1
```

But avoid excessive `VALUE()` tricks.

---

### 4. Drop large stems after use

After processing a large chunk:

```rexx
drop in.
```

After writing output:

```rexx
drop out.
out. = ''
out.0 = 0
```

This reduces stale-data bugs and may help storage behavior.

---

## Parsing Rules

### 1. Use `PARSE` idiomatically

Example:

```rexx
parse upper arg action dsn .
```

For fixed fields:

```rexx
parse var line jobName 1 8 status 10 18 rest
```

For delimiter-based parsing:

```rexx
parse var line key '=' value
key   = strip(key)
value = strip(value)
```

---

### 2. Validate external input early

Example:

```rexx
parse upper arg action dsn .

if action = '' then do
  say 'ERROR: Missing ACTION.'
  say 'Usage: MYEXEC CHECK dataset.name'
  rc = 8
  signal Cleanup
end

if wordpos(action, 'CHECK REPORT DELETE') = 0 then do
  say 'ERROR: Invalid ACTION:' action
  rc = 8
  signal Cleanup
end
```

---

## Performance Rules

### 1. Avoid reading unknown-size datasets into memory

Use chunked `EXECIO`.

### 2. Avoid one-command-per-record when possible

Do not issue expensive TSO, ISPF, SDSF, or system commands inside a large record loop unless unavoidable.

Bad:

```rexx
do i = 1 to in.0
  address tso "LISTDS '"in.i"'"
end
```

Better:

- pre-filter input,
- group work,
- reduce command calls,
- use bulk services if available,
- document if one-command-per-record is unavoidable.

### 3. Avoid busy waits

Use approved wait/sleep service.

### 4. Limit output volume

For production scripts, print summary by default. Detailed trace should require an explicit debug flag.

### 5. Use `TRACE` only for debugging

Do not leave `TRACE ?R` or verbose tracing enabled in production.

Use a simple debug flag:

```rexx
debug = 0

if debug = 1 then say 'DEBUG: value='value
```

---

## Style Rules

### 1. Header required

Every exec should start with a clear header.

```rexx
/* REXX ***************************************************************/
/* Name:     EXECNAME                                                 */
/* Purpose:  One sentence purpose                                     */
/*                                                                    */
/* Inputs:   DD INPUT - input records                                 */
/* Outputs:  DD OUTPUT - report                                       */
/*                                                                    */
/* Args:     ACTION DSN                                               */
/*                                                                    */
/* RC:       0 success                                                */
/*           4 warning/no records                                     */
/*           8 input or processing error                              */
/*           12 severe/environment error                              */
/*           16 unexpected internal error                             */
/*                                                                    */
/* Notes:    Reads input in chunks. Does not use EXECIO * for input.   */
/**********************************************************************/
```

---

### 2. Comments should explain why, not every line

Good:

```rexx
/* Read in chunks to avoid loading large datasets into storage. */
```

Bad:

```rexx
i = i + 1     /* Add 1 to i */
```

---

### 3. Use uppercase for commands, but do not obsess

This is fine:

```rexx
address tso "EXECIO" readChunk "DISKR INPUT (STEM IN."
```

This is also acceptable if consistent:

```rexx
address tso "execio" readChunk "diskr input (stem in."
```

Prefer readability and site convention.

---

### 4. Keep line length reasonable

Avoid very long command strings. Build them clearly if needed.

```rexx
cmd = "ALLOC FI("inputDD") DA('"dsn"') SHR REUSE"
address tso cmd
cmdRc = rc
```

---

## Anti-Patterns

Do not generate code with these patterns unless explicitly requested and justified.

### Anti-pattern: unnecessary framework

Bad:

```rexx
call MainController
call ServiceFactory
call DatasetRepositoryInit
call LoggerInit
call ValidatorFactory
```

REXX operational scripts do not need this.

---

### Anti-pattern: excessive small procedures

Bad:

```rexx
call SetDefaults
call SetInputDD
call SetOutputDD
call SetReadChunk
call SetFlags
call SetCounters
```

Prefer one simple initialization block.

---

### Anti-pattern: many exposed variables

Bad:

```rexx
Process: procedure expose a. b. c. inputDD outputDD rc eof count1 count2 debug options.
```

This is fragile and hard to maintain.

---

### Anti-pattern: `EXECIO * DISKR` for large or unknown input

Bad:

```rexx
address tso "EXECIO * DISKR INPUT (STEM IN. FINIS"
```

Use chunked reading.

---

### Anti-pattern: command inside huge loop

Bad:

```rexx
do i = 1 to in.0
  address tso "ALLOC FI(TEMP) DA('"in.i"') SHR REUSE"
  address tso "FREE FI(TEMP)"
end
```

This may perform poorly and stress the system.

---

### Anti-pattern: silent RC ignore

Bad:

```rexx
address tso "FREE FI(INPUT)"
```

At least handle important errors. Cleanup frees may tolerate failure, but main operations must not.

---

### Anti-pattern: CPU-consuming wait

Bad:

```rexx
do until time('S') > target
end
```

Use system sleep/wait service.

---

## Preferred Template: Chunked Input Processing

Use this as the default pattern for reading records from a DD.

```rexx
/* REXX ***************************************************************/
/* Name:     CHKREAD                                                  */
/* Purpose:  Demonstrate safe chunked input processing                 */
/* Inputs:   DD INPUT                                                 */
/* RC:       0 OK, 4 no records, 8 I/O error, 16 internal error        */
/**********************************************************************/

signal on syntax  name SyntaxTrap
signal on novalue name NovalueTrap
signal on halt    name HaltTrap

rc          = 0
inputDD     = 'INPUT'
readChunk   = 1000
eof         = 0
totalRead   = 0
matchCount  = 0
inputOpen   = 0

/* Main processing */
do while eof = 0
  drop in.
  address tso "EXECIO" readChunk "DISKR" inputDD "(STEM IN."
  ioRc = rc
  inputOpen = 1

  select
    when ioRc = 0 then nop
    when ioRc = 2 then eof = 1
    otherwise do
      say 'ERROR: EXECIO DISKR failed for DD' inputDD 'RC='ioRc
      rc = 8
      signal Cleanup
    end
  end

  if in.0 > 0 then do i = 1 to in.0
    line = in.i
    totalRead = totalRead + 1

    /* Example processing */
    if pos('ERROR', translate(line)) > 0 then do
      matchCount = matchCount + 1
      say 'MATCH line' totalRead':' line
    end
  end
end

if totalRead = 0 then do
  say 'WARNING: No input records found.'
  rc = 4
end
else do
  say 'INFO: Records read='totalRead 'matches='matchCount
  rc = 0
end

signal Cleanup

Cleanup:
  if inputOpen = 1 then do
    address tso "EXECIO 0 DISKR" inputDD "(FINIS"
    inputOpen = 0
  end
  exit rc

SyntaxTrap:
  say 'ERROR: REXX syntax failure at line' sigl
  say sourceline(sigl)
  say 'Condition:' condition('C') condition('D')
  rc = 16
  signal Cleanup

NovalueTrap:
  say 'ERROR: Uninitialized variable at line' sigl
  say sourceline(sigl)
  say 'Condition:' condition('C') condition('D')
  rc = 16
  signal Cleanup

HaltTrap:
  say 'ERROR: Execution interrupted.'
  rc = 12
  signal Cleanup
```

---

## Preferred Template: Chunked Input and Batched Output

```rexx
/* REXX ***************************************************************/
/* Name:     COPYFILT                                                 */
/* Purpose:  Read INPUT in chunks and write selected records to OUTPUT */
/* Inputs:   DD INPUT                                                 */
/* Outputs:  DD OUTPUT                                                */
/* RC:       0 OK, 4 no selected records, 8 I/O error, 16 internal     */
/**********************************************************************/

signal on syntax  name SyntaxTrap
signal on novalue name NovalueTrap
signal on halt    name HaltTrap

rc           = 0
inputDD      = 'INPUT'
outputDD     = 'OUTPUT'
readChunk    = 1000
writeLimit   = 1000
eof          = 0
inputOpen    = 0
outputOpen   = 0
totalRead    = 0
totalWritten = 0

out. = ''
out.0 = 0

do while eof = 0
  drop in.
  address tso "EXECIO" readChunk "DISKR" inputDD "(STEM IN."
  ioRc = rc
  inputOpen = 1

  select
    when ioRc = 0 then nop
    when ioRc = 2 then eof = 1
    otherwise do
      say 'ERROR: EXECIO DISKR failed. DD='inputDD 'RC='ioRc
      rc = 8
      signal Cleanup
    end
  end

  do i = 1 to in.0
    line = in.i
    totalRead = totalRead + 1

    /* Example filter condition */
    if pos('KEEP', translate(line)) > 0 then do
      call AddOut line
      totalWritten = totalWritten + 1
    end

    if out.0 >= writeLimit then call FlushOut
  end
end

call FlushOut

if totalWritten = 0 then do
  say 'WARNING: No records selected. Input records='totalRead
  rc = 4
end
else do
  say 'INFO: Input records='totalRead 'Output records='totalWritten
  rc = 0
end

signal Cleanup

AddOut:
  parse arg outLine
  out.0 = out.0 + 1
  out.out.0 = outLine
  return

FlushOut:
  if out.0 = 0 then return

  address tso "EXECIO" out.0 "DISKW" outputDD "(STEM OUT."
  ioRc = rc
  outputOpen = 1

  if ioRc <> 0 then do
    say 'ERROR: EXECIO DISKW failed. DD='outputDD 'RC='ioRc
    rc = 8
    signal Cleanup
  end

  drop out.
  out. = ''
  out.0 = 0
  return

Cleanup:
  if inputOpen = 1 then do
    address tso "EXECIO 0 DISKR" inputDD "(FINIS"
    inputOpen = 0
  end

  if outputOpen = 1 then do
    address tso "EXECIO 0 DISKW" outputDD "(FINIS"
    outputOpen = 0
  end

  exit rc

SyntaxTrap:
  say 'ERROR: REXX syntax failure at line' sigl
  say sourceline(sigl)
  say 'Condition:' condition('C') condition('D')
  rc = 16
  signal Cleanup

NovalueTrap:
  say 'ERROR: Uninitialized variable at line' sigl
  say sourceline(sigl)
  say 'Condition:' condition('C') condition('D')
  rc = 16
  signal Cleanup

HaltTrap:
  say 'ERROR: Execution interrupted.'
  rc = 12
  signal Cleanup
```

---

## Preferred Template: Dynamic Allocation with Cleanup

Use only when dynamic allocation is needed.

```rexx
/* REXX ***************************************************************/
/* Name:     DYNREAD                                                  */
/* Purpose:  Allocate a dataset, read it safely, then free it          */
/* Args:     dataset.name                                             */
/**********************************************************************/

signal on syntax  name SyntaxTrap
signal on novalue name NovalueTrap
signal on halt    name HaltTrap

parse arg dsn .
dsn = strip(dsn)

rc         = 0
inputDD    = 'INDD'
inputAlloc = 0
inputOpen  = 0
readChunk  = 1000
eof        = 0
totalRead  = 0

if dsn = '' then do
  say 'ERROR: Missing dataset name.'
  say 'Usage: DYNREAD dataset.name'
  rc = 8
  signal Cleanup
end

address tso "ALLOC FI("inputDD") DA('"dsn"') SHR REUSE"
cmdRc = rc
if cmdRc <> 0 then do
  say 'ERROR: ALLOC failed for' dsn 'RC='cmdRc
  rc = 8
  signal Cleanup
end
inputAlloc = 1

do while eof = 0
  drop in.
  address tso "EXECIO" readChunk "DISKR" inputDD "(STEM IN."
  ioRc = rc
  inputOpen = 1

  select
    when ioRc = 0 then nop
    when ioRc = 2 then eof = 1
    otherwise do
      say 'ERROR: EXECIO DISKR failed. RC='ioRc
      rc = 8
      signal Cleanup
    end
  end

  totalRead = totalRead + in.0

  do i = 1 to in.0
    line = in.i
    /* Process line here */
  end
end

say 'INFO: Records read='totalRead
rc = 0

signal Cleanup

Cleanup:
  if inputOpen = 1 then do
    address tso "EXECIO 0 DISKR" inputDD "(FINIS"
    inputOpen = 0
  end

  if inputAlloc = 1 then do
    address tso "FREE FI("inputDD")"
    inputAlloc = 0
  end

  exit rc

SyntaxTrap:
  say 'ERROR: REXX syntax failure at line' sigl
  say sourceline(sigl)
  say 'Condition:' condition('C') condition('D')
  rc = 16
  signal Cleanup

NovalueTrap:
  say 'ERROR: Uninitialized variable at line' sigl
  say sourceline(sigl)
  say 'Condition:' condition('C') condition('D')
  rc = 16
  signal Cleanup

HaltTrap:
  say 'ERROR: Execution interrupted.'
  rc = 12
  signal Cleanup
```

---

## Preferred Template: Safe Sleep / Wait

Use the site-approved syscall pattern. This template assumes `ADDRESS SYSCALL` is available.

```rexx
/* Wait 10 seconds without busy-waiting. */
waitSeconds = 10

address syscall 'sleep' waitSeconds
sleepRc = rc

if sleepRc <> 0 then do
  say 'WARNING: SYSCALL sleep returned RC='sleepRc
end
```

Do not replace this with CPU-consuming loops.

If `ADDRESS SYSCALL` is unavailable in the target environment, use the approved site-local wait service.

---

## ISPF Rules

Use ISPF services only when the exec is guaranteed to run under ISPF or when the exec explicitly starts/validates the ISPF environment.

Always check `RC` after `ADDRESS ISPEXEC`.

Example:

```rexx
address ispexec "VGET (ZUSER) SHARED"
ispfRc = rc
if ispfRc <> 0 then do
  say 'ERROR: ISPF VGET failed. RC='ispfRc
  rc = 8
  signal Cleanup
end
```

Do not use ISPF services in batch/non-ISPF contexts unless the local standard supports it.

---

## TSO/E External Functions

Prefer TSO/E external functions where they are simpler and safer than parsing command output.

Examples:

```rexx
dsinfo = listdsi("'"dsn"'")
if rc <> 0 then do
  say 'ERROR: LISTDSI failed for' dsn 'RC='rc 'SYSREASON='sysreason
end
else do
  say 'INFO: DSORG='sysdsorg 'RECFM='sysrecfm 'LRECL='syslrecl
end
```

Before using a TSO/E external function, confirm it is available in the target address space.

---

## Dataset Handling Rules

1. Quote dataset names in TSO commands.
2. Do not assume current TSO prefix.
3. Validate member names if building PDS member references.
4. Avoid deleting, renaming, or overwriting datasets unless explicitly requested.
5. For destructive actions, require explicit parameter or confirmation flag.
6. In batch, do not prompt interactively unless explicitly required.
7. Log the dataset name and action before destructive operations.

Example destructive-operation guard:

```rexx
parse upper arg action dsn confirm .

if action = 'DELETE' & confirm <> 'CONFIRM' then do
  say 'ERROR: DELETE requires CONFIRM parameter.'
  rc = 8
  signal Cleanup
end
```

---

## Logging Rules

Use simple `SAY` statements unless the program explicitly writes a report.

Recommended message levels:

```rexx
say 'INFO: Starting' execName
say 'WARNING: No matching records found.'
say 'ERROR: EXECIO failed. RC='ioRc
```

Avoid excessive debug output by default.

---

## Return Code Discipline

Do not let cleanup commands overwrite the program's meaningful RC.

Bad:

```rexx
rc = 8
address tso "FREE FI(INPUT)"
exit rc
```

In REXX, `RC` may be changed by the command. Preserve the intended return code.

Good:

```rexx
finalRc = rc
address tso "FREE FI(INPUT)"
rc = finalRc
exit rc
```

Recommended cleanup pattern:

```rexx
Cleanup:
  finalRc = rc

  if inputOpen = 1 then do
    address tso "EXECIO 0 DISKR" inputDD "(FINIS"
    inputOpen = 0
  end

  if inputAlloc = 1 then do
    address tso "FREE FI("inputDD")"
    inputAlloc = 0
  end

  rc = finalRc
  exit rc
```

---

## Code Review Checklist

Before finalizing generated REXX code, verify:

- [ ] Header explains purpose, inputs, outputs, arguments, RC.
- [ ] Main flow is simple and mostly linear.
- [ ] No unnecessary framework or excessive routines.
- [ ] `PROCEDURE` is not overused.
- [ ] No large `EXPOSE` lists.
- [ ] Variables are explicitly initialized.
- [ ] `SIGNAL ON SYNTAX`, `NOVALUE`, and `HALT` are present where appropriate.
- [ ] Important host commands check `RC`.
- [ ] Dataset names are quoted properly.
- [ ] Large/unknown input is not read with `EXECIO * DISKR`.
- [ ] Input is read in chunks, typically 1000 records.
- [ ] Output is batched if potentially large.
- [ ] Files are closed with `FINIS`.
- [ ] Dynamically allocated DDs are freed.
- [ ] Cleanup preserves the intended final RC.
- [ ] No CPU-consuming wait loops.
- [ ] SYSCALL sleep or site-approved wait service is used.
- [ ] No destructive operation without explicit confirmation.
- [ ] Debug/trace output is disabled by default.
- [ ] Return codes are meaningful and documented.
- [ ] Code can be understood quickly by a mainframe operations programmer.

---

## Generation Instructions for Agent

When asked to write REXX for z/OS / MVS:

1. First identify the expected runtime:
   - TSO foreground,
   - batch TSO,
   - ISPF,
   - System REXX,
   - USS,
   - other address space.

2. Check local manuals and approved examples.

3. Choose the simplest script-like design.

4. Do not introduce frameworks, classes, generic libraries, or excessive routines.

5. Use hardcoded stable constants where appropriate.

6. Use built-in REXX functions before writing custom parsing functions.

7. For file input:
   - prefer DD-based input,
   - use chunked `EXECIO`,
   - do not use `EXECIO * DISKR` for large or unknown input.

8. For waiting:
   - do not busy-wait,
   - use `ADDRESS SYSCALL 'sleep n'` if available,
   - otherwise use the site-approved wait mechanism.

9. Always check important command return codes.

10. Always include safe cleanup.

11. Preserve final return code during cleanup.

12. Produce readable REXX code, not clever REXX code.

```

---

## 我建议你再补充给 Agent 的本地资料

你可以下载或放入以下资料，作为本地 RAG / skill 参考：

1. **IBM z/OS TSO/E REXX Reference**  
   最重要。让 Agent 优先查语法、内置函数、`PARSE`、`SIGNAL`、compound variable、condition handling。

2. **IBM z/OS TSO/E REXX User’s Guide**  
   适合查整体用法、函数、TSO/E 外部函数、I/O、不同地址空间注意事项。IBM 说明这个 guide 面向使用 TSO/E REXX 的程序员，并覆盖 REXX 与 TSO/E、MVS、APPC/MVS、ISPF 的交互。([ibm.com](https://www.ibm.com/docs/en/zos/3.2.0?topic=tsoe-zos-rexx-users-guide&utm_source=openai))

3. **IBM EXECIO command documentation**  
   Agent 很容易误用 `EXECIO * DISKR`，所以应该把 EXECIO 文档和你们公司标准示例单独放一份。IBM 文档中有逐条读取、EOF flag、`FINIS` 等示例；这可以作为 Agent 模仿 chunked read 的依据。([ibm.com](https://www.ibm.com/docs/en/zos/3.1.0?topic=commands-execio&utm_source=openai))

4. **IBM z/OS UNIX System Services: REXX syscall / sleep**  
   用于你提到的等待逻辑。IBM 的 `sleep` callable service 文档说明其作用是挂起调用线程指定秒数，而不是消耗 CPU 做循环等待。([ibm.com](https://www.ibm.com/docs/en/zos/3.2.0?topic=commands-sleep&utm_source=openai))

5. **ISPF Services Guide**  
   如果你们脚本会调用 `ADDRESS ISPEXEC`，这个必须有。

6. **公司内部优秀 REXX 样例**  
   这个非常关键。建议挑 10-20 个你认可的 production REXX，去掉敏感信息后放到 `approved_examples/`。Agent 对“风格”的学习经常比读 manual 更有效。

---

## 可以再加一个 `README` 给 Copilot

你可以在 skill 目录旁边放一个短 README，进一步压制 Copilot 过度工程化倾向：

```markdown
# REXX Generation Priority

For z/OS REXX, prefer production operations script style.

Do not write Java/Python-style architecture.

Default style:

- one exec,
- simple top-down flow,
- few labels,
- minimal PROCEDURE,
- no generic framework,
- chunked EXECIO,
- explicit RC checks,
- safe cleanup,
- hardcoded stable constants,
- readable operational messages.

If the requested task can be done in 100 clear lines, do not generate 300 lines.
```

---

## 我个人建议的最终目录结构

```text
rexx-skill/
  SKILL.md
  README.md
  examples/
    chunked_read.rexx
    chunked_read_write.rexx
    dynamic_alloc_cleanup.rexx
    syscall_sleep.rexx
    listdsi_example.rexx
  anti_patterns/
    avoid_execio_star.md
    avoid_over_procedure.md
    avoid_busy_wait.md
  manuals/
    ibm_tsoe_rexx_reference.pdf
    ibm_tsoe_rexx_users_guide.pdf
    ibm_execio_command.pdf
    ibm_ispf_services_guide.pdf
    ibm_unix_syscall_sleep.pdf
  company/
    site_rexx_standards.md
    approved_examples/
```

这样比只放一份长 skill 更好，因为 Copilot/Agent 可以同时检索到：

- 总原则；
- 推荐代码；
- 禁止模式；
- IBM 原始依据；
- 公司认可样例。

---

如果你愿意，我还可以继续帮你把上面这份内容整理成 **GitHub Copilot Custom Instructions / skill repository** 的形式，例如：

```text
.github/
  copilot-instructions.md
skills/
  zos-rexx/
    SKILL.md
    examples/
```

或者帮你写一版更“强约束”的 `copilot-instructions.md`，专门用来阻止它生成过度模块化、过多 `PROCEDURE EXPOSE`、`EXECIO *` 的 REXX。

---
Learn more:
1. [Abstract for TSO/E REXX User's Guide](https://www.ibm.com/docs/en/zos/3.2.0?topic=tsoe-zos-rexx-users-guide&utm_source=openai)
2. [EXECIO](https://www.ibm.com/docs/en/zos/3.1.0?topic=commands-execio&utm_source=openai)
3. [sleep](https://www.ibm.com/docs/en/zos/3.2.0?topic=commands-sleep&utm_source=openai)
