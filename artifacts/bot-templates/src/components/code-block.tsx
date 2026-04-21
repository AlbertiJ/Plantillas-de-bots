import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

type Token = { type: "keyword" | "string" | "comment" | "number" | "function" | "plain"; value: string };

const KEYWORDS = new Set([
  "import","from","def","class","return","if","elif","else","for","while",
  "try","except","finally","with","as","pass","break","continue","yield",
  "async","await","global","nonlocal","lambda","True","False","None",
  "and","or","not","is","in","raise","assert","del","print","self",
]);

function tokenizePython(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    // Comment
    if (line[i] === "#") {
      tokens.push({ type: "comment", value: line.slice(i) });
      break;
    }

    // String (double or single quote)
    if (line[i] === '"' || line[i] === "'") {
      const quote = line[i];
      // Check triple quote
      if (line.slice(i, i + 3) === quote.repeat(3)) {
        const end = line.indexOf(quote.repeat(3), i + 3);
        if (end !== -1) {
          tokens.push({ type: "string", value: line.slice(i, end + 3) });
          i = end + 3;
        } else {
          tokens.push({ type: "string", value: line.slice(i) });
          break;
        }
      } else {
        let j = i + 1;
        while (j < line.length && line[j] !== quote) {
          if (line[j] === "\\") j++;
          j++;
        }
        tokens.push({ type: "string", value: line.slice(i, j + 1) });
        i = j + 1;
      }
      continue;
    }

    // Number
    if (/\d/.test(line[i]) && (i === 0 || /\W/.test(line[i - 1]))) {
      let j = i;
      while (j < line.length && /[\d._]/.test(line[j])) j++;
      tokens.push({ type: "number", value: line.slice(i, j) });
      i = j;
      continue;
    }

    // Identifier (keyword, function, or plain)
    if (/[a-zA-Z_]/.test(line[i])) {
      let j = i;
      while (j < line.length && /\w/.test(line[j])) j++;
      const word = line.slice(i, j);
      if (KEYWORDS.has(word)) {
        tokens.push({ type: "keyword", value: word });
      } else if (line[j] === "(") {
        tokens.push({ type: "function", value: word });
      } else {
        tokens.push({ type: "plain", value: word });
      }
      i = j;
      continue;
    }

    // Plain character
    tokens.push({ type: "plain", value: line[i] });
    i++;
  }

  return tokens;
}

const TOKEN_COLORS: Record<Token["type"], string> = {
  keyword: "#c678dd",
  string: "#98c379",
  comment: "#7f848e",
  number: "#d19a66",
  function: "#61afef",
  plain: "#abb2bf",
};

function renderLine(line: string, lineNum: number) {
  const tokens = tokenizePython(line);
  return (
    <div key={lineNum} style={{ display: "table-row" }}>
      <span
        style={{
          display: "table-cell",
          textAlign: "right",
          paddingRight: "1.25rem",
          userSelect: "none",
          opacity: 0.35,
          fontSize: "0.75rem",
          minWidth: "2rem",
          color: "#abb2bf",
        }}
      >
        {lineNum}
      </span>
      <span style={{ display: "table-cell", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
        {tokens.map((tok, idx) => (
          <span key={idx} style={{ color: TOKEN_COLORS[tok.type] }}>
            {tok.value}
          </span>
        ))}
      </span>
    </div>
  );
}

export function CodeBlock({ code, language = "python", filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split("\n");

  return (
    <div
      className="my-4 rounded-md border border-zinc-800 overflow-hidden"
      data-testid={`codeblock-${filename || "snippet"}`}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-xs font-mono text-zinc-400">{filename || language}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          onClick={copyToClipboard}
          data-testid="button-copy-code"
        >
          {copied ? (
            <Check className="h-4 w-4 mr-2 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          {copied ? "Copied" : "Copy Code"}
        </Button>
      </div>
      <div
        style={{
          backgroundColor: "#282c34",
          padding: "1rem",
          overflowX: "auto",
          fontSize: "0.8rem",
          fontFamily: "Menlo, Monaco, Consolas, 'Courier New', monospace",
          lineHeight: "1.6",
        }}
      >
        <div style={{ display: "table", width: "100%" }}>
          {lines.map((line, i) => renderLine(line, i + 1))}
        </div>
      </div>
    </div>
  );
}
