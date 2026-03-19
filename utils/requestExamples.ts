export type RequestExampleTabId = 'nodejs' | 'fetch' | 'curl' | 'python' | 'golang'

export interface RequestExampleInput {
  /** HTTP method, e.g. GET/POST */
  method: string
  /** Absolute URL string (including origin) */
  url: string
  /** Optional headers */
  headers?: Record<string, string>
  /** Optional request body (usually JSON string) */
  body?: string
}

function tryParseJson(body?: string): { jsonMin: string; jsonPretty: string } | null {
  if (!body) return null
  try {
    const parsed = JSON.parse(body)
    return {
      jsonMin: JSON.stringify(parsed),
      jsonPretty: JSON.stringify(parsed, null, 2),
    }
  } catch {
    return null
  }
}

function formatHeadersForJs(headers: Record<string, string> | undefined): string {
  const safe = headers ?? {}
  return JSON.stringify(safe, null, 2)
}

function escapeSingleQuotes(value: string): string {
  return value.replace(/'/g, `'\\''`)
}

function indentMultilineExceptFirst(text: string, prefix: string): string {
  const lines = text.split('\n')
  if (lines.length <= 1) return text
  return `${lines[0]}\n${lines
    .slice(1)
    .map((line) => `${prefix}${line}`)
    .join('\n')}`
}

/**
 * Build ready-to-copy request examples for common languages/clients.
 * The output is plain text code; it does not execute anything.
 *
 * @param input Request example inputs (method/url/headers/body)
 * @returns Map from tab id to code string
 */
export function buildRequestExamples(input: RequestExampleInput): Record<RequestExampleTabId, string> {
  const method = input.method.toUpperCase()
  const headers = input.headers ?? {}
  const hasBody = Boolean(input.body && input.body.trim().length > 0)
  const json = tryParseJson(input.body)

  const jsonMin = json?.jsonMin ?? input.body?.trim() ?? ''
  const jsonPretty = json?.jsonPretty ?? input.body?.trim() ?? ''

  const curlLines: string[] = [`curl -X ${method} '${escapeSingleQuotes(input.url)}'`]
  for (const [k, v] of Object.entries(headers)) {
    curlLines.push(`-H '${escapeSingleQuotes(`${k}: ${v}`)}'`)
  }
  if (hasBody && method !== 'GET') {
    curlLines.push(`--data '${escapeSingleQuotes(jsonMin)}'`)
  }

  const curl = (() => {
    if (curlLines.length <= 1) return `${curlLines[0]}\n`
    const formattedLines = curlLines.map((line, idx) => {
      const isLast = idx === curlLines.length - 1
      const indent = idx === 0 ? '' : '  '
      if (isLast) return `${indent}${line}`
      return `${indent}${line} \\`
    })

    return formattedLines.join('\n') + '\n'
  })()

  const headersJs = formatHeadersForJs(headers)
  const nodeHeadersJs = indentMultilineExceptFirst(headersJs, '  ')
  const hasJsonBody = hasBody && method !== 'GET' && Boolean(json)
  const nodeFetchBody = hasJsonBody ? `\n    body: JSON.stringify(payload),` : ''
  const nodeFetchPayloadJson = hasJsonBody ? indentMultilineExceptFirst(jsonPretty, '  ') : ''
  const nodeFetchPayload = hasJsonBody ? `\n  const payload = ${nodeFetchPayloadJson}\n` : ''

  const fetchExample = hasJsonBody
    ? `const url = '${input.url}';\nconst headers = ${headersJs};\n\nconst payload = ${jsonPretty};\n\nconst res = await fetch(url, {\n  method: '${method}',\n  headers,\n  body: JSON.stringify(payload),\n});\n\nconst text = await res.text();\nconsole.log(res.status);\nconsole.log(text);\n`
    : `const url = '${input.url}';\nconst headers = ${headersJs};\n\nconst res = await fetch(url, {\n  method: '${method}',\n  headers,\n});\n\nconst text = await res.text();\nconsole.log(res.status);\nconsole.log(text);\n`

  const nodejsExample = `async function main() {\n  const url = '${input.url}';\n  const headers = ${nodeHeadersJs};\n${nodeFetchPayload}${nodeFetchBody ? `\n  const res = await fetch(url, {\n    method: '${method}',\n    headers,\n${nodeFetchBody}\n  });\n` : `\n  const res = await fetch(url, {\n    method: '${method}',\n    headers,\n  });\n`}\n  const text = await res.text();\n  console.log(res.status);\n  console.log(text);\n}\n\nmain().catch(console.error);\n`

  const headersJson = JSON.stringify(headers, null, 2)
  const payloadJson = jsonMin
  const pythonHeaders = `headers = json.loads('''${headersJson}''')`
  const pythonPayload = hasJsonBody ? `\npayload = json.loads('''${payloadJson}''')\n` : ''
  const pythonReqBody = hasJsonBody
    ? `\nresponse = requests.request('${method}', url, headers=headers, json=payload)`
    : `\nresponse = requests.request('${method}', url, headers=headers)`
  const python = `import json\nimport requests\n\nurl = '${input.url}'\n${pythonHeaders}${pythonPayload}${pythonReqBody}\n\nprint(response.status_code)\nprint(response.text)\n`

  const goHeadersEntries = Object.entries(headers)
    .map(([k, v]) => `\t\t"${k}": "${v}",`)
    .join('\n')

  if (hasJsonBody) {
    const golang = `package main\n\nimport (\n\t\"bytes\"\n\t\"fmt\"\n\t\"io\"\n\t\"net/http\"\n)\n\nfunc main() {\n\turl := \"${input.url}\"\n\tpayload := []byte(\`${jsonMin}\`)\n\n\treq, err := http.NewRequest(\"${method}\", url, bytes.NewBuffer(payload))\n\tif err != nil {\n\t\tpanic(err)\n\t}\n\n\theaders := map[string]string{\n${goHeadersEntries}\n\t}\n\tfor k, v := range headers {\n\t\treq.Header.Set(k, v)\n\t}\n\n\tclient := &http.Client{}\n\tres, err := client.Do(req)\n\tif err != nil {\n\t\tpanic(err)\n\t}\n\tdefer res.Body.Close()\n\n\tbodyBytes, _ := io.ReadAll(res.Body)\n\tfmt.Println(res.StatusCode)\n\tfmt.Println(string(bodyBytes))\n}\n`
    return {
      nodejs: nodejsExample,
      fetch: fetchExample,
      curl,
      python,
      golang,
    }
  }

  const golangNoBody = `package main\n\nimport (\n\t\"fmt\"\n\t\"io\"\n\t\"net/http\"\n\t\"strings\"\n)\n\nfunc main() {\n\turl := \"${input.url}\"\n\tvar payload string = \"\"\n\n\treq, err := http.NewRequest(\"${method}\", url, strings.NewReader(payload))\n\tif err != nil {\n\t\tpanic(err)\n\t}\n\n\theaders := map[string]string{\n${goHeadersEntries}\n\t}\n\tfor k, v := range headers {\n\t\treq.Header.Set(k, v)\n\t}\n\n\tclient := &http.Client{}\n\tres, err := client.Do(req)\n\tif err != nil {\n\t\tpanic(err)\n\t}\n\tdefer res.Body.Close()\n\n\tbodyBytes, _ := io.ReadAll(res.Body)\n\tfmt.Println(res.StatusCode)\n\tfmt.Println(string(bodyBytes))\n}\n`

  return {
    nodejs: nodejsExample,
    fetch: fetchExample,
    curl,
    python,
    golang: golangNoBody,
  }
}
