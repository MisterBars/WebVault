export const HIGHLIGHT_ROLES=[
  {
    "tag": "heading",
    "class": "wv-md-heading"
  },
  {
    "tag": "heading1",
    "class": "wv-md-heading wv-md-h1"
  },
  {
    "tag": "heading2",
    "class": "wv-md-heading wv-md-h2"
  },
  {
    "tag": "heading3",
    "class": "wv-md-heading wv-md-h3"
  },
  {
    "tag": "heading4",
    "class": "wv-md-heading wv-md-h4"
  },
  {
    "tag": "heading5",
    "class": "wv-md-heading wv-md-h5"
  },
  {
    "tag": "heading6",
    "class": "wv-md-heading wv-md-h6"
  },
  {
    "tag": "processingInstruction",
    "class": "wv-md-formatting"
  },
  {
    "tag": "contentSeparator",
    "class": "wv-md-formatting"
  },
  {
    "tag": "emphasis",
    "class": "wv-md-em"
  },
  {
    "tag": "strong",
    "class": "wv-md-strong"
  },
  {
    "tag": "strikethrough",
    "class": "wv-md-strike"
  },
  {
    "tag": "link",
    "class": "wv-md-link"
  },
  {
    "tag": "url",
    "class": "wv-md-url"
  },
  {
    "tag": "monospace",
    "class": "wv-md-code"
  },
  {
    "tag": "quote",
    "class": "wv-md-quote"
  },
  {
    "tag": "list",
    "class": "wv-md-list"
  },
  {
    "tag": "comment",
    "class": "wv-syntax-comment"
  },
  {
    "tag": "meta",
    "class": "wv-syntax-meta"
  },
  {
    "tag": "keyword",
    "class": "wv-syntax-keyword"
  },
  {
    "tag": "string",
    "class": "wv-syntax-string"
  },
  {
    "tag": "number",
    "class": "wv-syntax-number"
  },
  {
    "tag": "bool",
    "class": "wv-syntax-number"
  },
  {
    "tag": "name",
    "class": "wv-syntax-name"
  },
  {
    "tag": "operator",
    "class": "wv-syntax-operator"
  },
  {
    "tag": "punctuation",
    "class": "wv-syntax-punctuation"
  },
  {
    "tag": "invalid",
    "class": "wv-syntax-invalid"
  }
];
export const NOTE_CSS="body.webvault-workspace{font-family:var(--wv-ui-font,var(--font-interface,sans-serif))}\nbody.webvault-workspace::selection,body.webvault-workspace ::selection{background:var(--wv-selection-background,var(--text-selection));color:var(--wv-selection-text,var(--text-normal))}\n.cm-editor.wv-themed-editor{color:var(--text-normal);background:var(--background-primary);font-size:var(--font-text-size,16px)}\n.cm-editor.wv-themed-editor .cm-scroller,.cm-editor.wv-themed-editor .cm-content{font-family:var(--wv-editor-font,var(--font-text,sans-serif));line-height:var(--line-height-normal,1.6)}\n.cm-editor.wv-themed-editor .cm-content{font-size:inherit;font-weight:var(--wv-note-weight,400);caret-color:var(--caret-color,var(--text-normal))}\n.cm-editor.wv-themed-editor .cm-selectionLayer .cm-selectionBackground{background:var(--wv-selection-background,var(--text-selection))!important}\nbody.webvault-workspace .cm-editor.wv-themed-editor .cm-content input:focus::selection,body.webvault-workspace .cm-editor.wv-themed-editor .cm-content textarea:focus::selection{background:var(--wv-selection-background,var(--text-selection))!important;color:var(--wv-selection-text,var(--text-normal))!important}\n.cm-editor.wv-themed-editor .cm-cursor{border-left-color:var(--caret-color,var(--text-normal))}\n.cm-editor.wv-themed-editor .cm-activeLine,.cm-editor.wv-themed-editor .cm-activeLineGutter{background:var(--wv-active-line-background,var(--background-modifier-hover))}\n.cm-editor.wv-themed-editor .cm-selectionMatch,.cm-editor.wv-themed-editor .cm-searchMatch{background:var(--text-highlight-bg,var(--background-modifier-active-hover));outline:1px solid var(--background-modifier-border)}\n.cm-editor.wv-themed-editor .cm-searchMatch-selected{outline-color:var(--interactive-accent)}\n.cm-editor.wv-themed-editor .cm-panels,.cm-editor.wv-themed-editor .cm-tooltip{background:var(--background-secondary);color:var(--text-normal);border-color:var(--background-modifier-border);font-family:var(--wv-ui-font,var(--font-interface,sans-serif));font-size:var(--font-ui-small,13px)}\n.cm-editor.wv-themed-editor .cm-textfield,.cm-editor.wv-themed-editor .cm-button{background:var(--background-modifier-form-field);color:var(--text-normal);border-color:var(--background-modifier-border);font:inherit}\nbody.webvault-workspace .wv-reading-pane,body.webvault-workspace .wv-render{font-family:var(--wv-note-font,var(--font-text,sans-serif));font-size:var(--font-text-size,16px);font-weight:var(--wv-note-weight,400);line-height:var(--line-height-normal,1.6)}\n.cm-editor.wv-themed-editor .wv-render{font-family:var(--wv-editor-font,var(--font-text,sans-serif))}\nbody.webvault-workspace .wv-properties{font-family:var(--wv-ui-font,var(--font-interface,sans-serif));font-size:var(--font-ui-small,13px);font-weight:400}\nbody.webvault-workspace .wv-properties h3{font-family:inherit;font-size:var(--font-ui-small,13px);font-weight:var(--wv-ui-heading-weight,600)}\nbody.webvault-workspace .wv-render code{font-family:var(--wv-code-font,var(--font-monospace,monospace));font-size:var(--wv-code-size,0.9em);color:var(--code-normal,var(--text-normal));background:var(--code-background,var(--background-secondary))}\nbody.webvault-workspace .wv-render\u003epre,body.webvault-workspace .wv-render blockquote pre,body.webvault-workspace .wv-render li pre{font-family:var(--wv-code-font,var(--font-monospace,monospace));background:var(--code-background,var(--background-secondary))}\nbody.webvault-workspace .wv-render a,.cm-editor.wv-themed-editor .wv-md-link,.cm-editor.wv-themed-editor .wv-md-url{color:var(--link-color,var(--text-accent));text-decoration:var(--link-decoration,underline)}\nbody.webvault-workspace .wv-render strong,.cm-editor.wv-themed-editor .wv-md-strong{font-weight:var(--font-bold,700);color:var(--bold-color,inherit)}\nbody.webvault-workspace .wv-render em,.cm-editor.wv-themed-editor .wv-md-em{font-style:italic;color:var(--italic-color,var(--text-italic,inherit))}\n.cm-editor.wv-themed-editor .wv-md-strike{text-decoration:line-through}\n.cm-editor.wv-themed-editor .wv-md-heading{font-weight:var(--font-bold,700)}\nbody.webvault-workspace .wv-render\u003eh1,body.webvault-workspace .wv-render blockquote h1,body.webvault-workspace .wv-render li h1,.cm-editor.wv-themed-editor .wv-md-h1{font-family:var(--h1-font,inherit);font-size:var(--h1-size,2em);font-weight:var(--h1-weight,var(--font-bold,700));font-style:var(--h1-style,normal);font-variant:var(--h1-variant,normal);line-height:var(--h1-line-height,var(--line-height-normal,1.6));color:var(--h1-color,var(--text-normal))}\nbody.webvault-workspace .wv-render\u003eh2,body.webvault-workspace .wv-render blockquote h2,body.webvault-workspace .wv-render li h2,.cm-editor.wv-themed-editor .wv-md-h2{font-family:var(--h2-font,inherit);font-size:var(--h2-size,1.5em);font-weight:var(--h2-weight,var(--font-bold,700));font-style:var(--h2-style,normal);font-variant:var(--h2-variant,normal);line-height:var(--h2-line-height,var(--line-height-normal,1.6));color:var(--h2-color,var(--text-normal))}\nbody.webvault-workspace .wv-render\u003eh3,body.webvault-workspace .wv-render blockquote h3,body.webvault-workspace .wv-render li h3,.cm-editor.wv-themed-editor .wv-md-h3{font-family:var(--h3-font,inherit);font-size:var(--h3-size,1.17em);font-weight:var(--h3-weight,var(--font-bold,700));font-style:var(--h3-style,normal);font-variant:var(--h3-variant,normal);line-height:var(--h3-line-height,var(--line-height-normal,1.6));color:var(--h3-color,var(--text-normal))}\nbody.webvault-workspace .wv-render\u003eh4,body.webvault-workspace .wv-render blockquote h4,body.webvault-workspace .wv-render li h4,.cm-editor.wv-themed-editor .wv-md-h4{font-family:var(--h4-font,inherit);font-size:var(--h4-size,1em);font-weight:var(--h4-weight,var(--font-bold,700));font-style:var(--h4-style,normal);font-variant:var(--h4-variant,normal);line-height:var(--h4-line-height,var(--line-height-normal,1.6));color:var(--h4-color,var(--text-normal))}\nbody.webvault-workspace .wv-render\u003eh5,body.webvault-workspace .wv-render blockquote h5,body.webvault-workspace .wv-render li h5,.cm-editor.wv-themed-editor .wv-md-h5{font-family:var(--h5-font,inherit);font-size:var(--h5-size,0.83em);font-weight:var(--h5-weight,var(--font-bold,700));font-style:var(--h5-style,normal);font-variant:var(--h5-variant,normal);line-height:var(--h5-line-height,var(--line-height-normal,1.6));color:var(--h5-color,var(--text-normal))}\nbody.webvault-workspace .wv-render\u003eh6,body.webvault-workspace .wv-render blockquote h6,body.webvault-workspace .wv-render li h6,.cm-editor.wv-themed-editor .wv-md-h6{font-family:var(--h6-font,inherit);font-size:var(--h6-size,0.67em);font-weight:var(--h6-weight,var(--font-bold,700));font-style:var(--h6-style,normal);font-variant:var(--h6-variant,normal);line-height:var(--h6-line-height,var(--line-height-normal,1.6));color:var(--h6-color,var(--text-normal))}\n.cm-editor.wv-themed-editor .wv-md-code{font-family:var(--wv-code-font,var(--font-monospace,monospace));color:var(--code-normal,var(--text-normal));background:transparent}\n.cm-editor.wv-themed-editor .wv-md-code:not(.wv-md-heading){font-size:var(--wv-code-size,0.9em)}\n.cm-editor.wv-themed-editor .wv-md-quote{color:var(--blockquote-color,var(--text-normal))}\n.cm-editor.wv-themed-editor .wv-syntax-comment,.cm-editor.wv-themed-editor .wv-syntax-meta{color:var(--code-comment,var(--text-muted))}\n.cm-editor.wv-themed-editor .wv-syntax-keyword{color:var(--code-keyword,var(--text-accent))}\n.cm-editor.wv-themed-editor .wv-syntax-string{color:var(--code-string,var(--text-normal))}\n.cm-editor.wv-themed-editor .wv-syntax-number{color:var(--code-value,var(--text-normal))}\n.cm-editor.wv-themed-editor .wv-syntax-name{color:var(--code-property,var(--text-normal))}\n.cm-editor.wv-themed-editor .wv-syntax-operator,.cm-editor.wv-themed-editor .wv-syntax-punctuation{color:var(--code-punctuation,var(--text-normal))}\n.cm-editor.wv-themed-editor .wv-syntax-invalid{color:var(--text-error)}\n.cm-editor.wv-themed-editor .wv-md-formatting{color:var(--wv-markup-color,var(--text-formatting,var(--text-muted)));font-weight:var(--wv-markup-weight,400);font-style:normal}\n";
export function createTokenPreview(style,supports){
 const roles={selection:['--text-selection','color'],selectionText:['--wv-selection-text','color'],markup:['--wv-markup-color','color'],textFont:['--font-text-theme','font-family'],editorFont:['--font-editor','font-family'],interfaceFont:['--font-interface-theme','font-family'],codeFont:['--font-monospace-theme','font-family'],textSize:['--font-text-size','font-size']};
 const saved=new Map();
 return {apply(values){
  const entries=Object.entries(values).map(([role,value])=>{
   if(!Object.prototype.hasOwnProperty.call(roles,role))throw new Error('Неизвестная роль: '+role);
   const [name,property]=roles[role];if(typeof value!=='string'||!supports(property,value))throw new Error('Недопустимое значение: '+role);
   return [name,value];
  });
  for(const [name,value] of entries){if(!saved.has(name))saved.set(name,{value:style.getPropertyValue(name),priority:style.getPropertyPriority(name)});style.setProperty(name,value);}
  return entries.map(([name])=>name);
 },reset(){for(const [name,old] of saved){if(old.value)style.setProperty(name,old.value,old.priority);else style.removeProperty(name);}saved.clear();}};
}
