import React, { useEffect, useRef } from "react";
import { Highlighter, Underline } from "lucide-react";

const COLORS = [
  { name: "Rojo", value: "#dc2626" },
  { name: "Azul", value: "#2563eb" },
  { name: "Verde", value: "#059669" },
  { name: "Amarillo", value: "#ca8a04" },
];

const escapeText = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[character]));

export const sanitizeRichText = (value) => {
  if (!value) return "";
  if (!/[<][a-z][\s\S]*[>]/i.test(value)) return escapeText(value).replace(/\n/g, "<br>");

  const documentNode = new DOMParser().parseFromString(value, "text/html");
  const allowedTags = new Set(["BR", "DIV", "P", "U", "SPAN", "FONT", "B", "STRONG", "I", "EM"]);

  const cleanNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return documentNode.createTextNode(node.nodeValue || "");
    if (node.nodeType !== Node.ELEMENT_NODE) return documentNode.createDocumentFragment();

    if (!allowedTags.has(node.tagName)) {
      const fragment = documentNode.createDocumentFragment();
      node.childNodes.forEach((child) => fragment.appendChild(cleanNode(child)));
      return fragment;
    }

    const cleanElement = documentNode.createElement(node.tagName.toLowerCase());
    if (node.tagName === "FONT" && node.getAttribute("color")) {
      cleanElement.setAttribute("color", node.getAttribute("color"));
    }
    if (node.tagName === "SPAN" && node.style.color) {
      cleanElement.style.color = node.style.color;
    }
    if (node.tagName === "SPAN" && node.style.textDecorationLine) {
      cleanElement.style.textDecorationLine = node.style.textDecorationLine;
    }
    if (node.tagName === "SPAN" && node.style.textDecorationColor) {
      cleanElement.style.textDecorationColor = node.style.textDecorationColor;
    }
    node.childNodes.forEach((child) => cleanElement.appendChild(cleanNode(child)));
    return cleanElement;
  };

  const fragment = documentNode.createDocumentFragment();
  documentNode.body.childNodes.forEach((node) => fragment.appendChild(cleanNode(node)));
  const container = documentNode.createElement("div");
  container.appendChild(fragment);
  return container.innerHTML;
};

export const RichTextDisplay = ({ value, className = "" }) => (
  <span className={className} dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }} />
);

export const RichTextField = ({ value, onChange, placeholder, required = false, rows = 3, className = "" }) => {
  const editorRef = useRef(null);
  const [underlineAll, setUnderlineAll] = React.useState(false);
  const minHeight = Math.max(64, rows * 24);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== sanitizeRichText(value)) {
      editorRef.current.innerHTML = sanitizeRichText(value);
    }
  }, [value]);

  const emitChange = () => onChange(sanitizeRichText(editorRef.current?.innerHTML || ""));

  const runCommand = (command, commandValue = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  const applyUnderlineColor = (color) => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) return;
    const wrapper = document.createElement("span");
    wrapper.style.color = color;
    wrapper.style.textDecorationLine = "underline";
    wrapper.style.textDecorationColor = color;
    wrapper.appendChild(range.extractContents());
    range.insertNode(wrapper);
    selection.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(wrapper);
    selection.addRange(nextRange);
    emitChange();
  };

  const toggleUnderlineAll = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("underline");
    selection.collapseToEnd();
    setUnderlineAll((active) => {
      if (!active && !document.queryCommandState("underline")) {
        document.execCommand("underline");
      }
      return !active;
    });
    emitChange();
  };

  return (
    <div className={`border border-slate-200 rounded-xl overflow-hidden bg-white ${className}`}>
      <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-50 border-b border-slate-100">
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("underline")} className="p-1.5 text-slate-600 hover:bg-white rounded-lg" title="Subrayar">
          <Underline className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={toggleUnderlineAll}
          className={`px-2 py-1.5 text-xs font-bold rounded-lg ${underlineAll ? "bg-sky-100 text-sky-700" : "text-slate-600 hover:bg-white"}`}
          title="Subrayar todo lo escrito y lo que escribas después"
        >
          Todo
        </button>
        <span className="w-px h-5 bg-slate-200 mx-1" />
        <Highlighter className="w-4 h-4 text-slate-500" />
        {COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyUnderlineColor(color.value)}
            className="w-5 h-5 rounded-full border border-white ring-1 ring-slate-200"
            style={{ backgroundColor: color.value }}
            title={`Subrayado ${color.name}`}
            aria-label={`Aplicar color ${color.name}`}
          />
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
        className="w-full px-3.5 py-2 text-sm text-slate-700 outline-none whitespace-pre-wrap empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400"
        style={{ minHeight }}
        suppressContentEditableWarning
      />
      {required && <input tabIndex={-1} required value={value.replace(/<[^>]*>/g, "").trim()} onChange={() => {}} className="sr-only" aria-hidden="true" />}
    </div>
  );
};
