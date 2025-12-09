import React, { useRef, useEffect, useState } from 'react';
import { Icons } from './Icons';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    onInsertVariable?: (position: number) => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    placeholder = 'Digite sua mensagem...',
    onInsertVariable
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        handleInput();
    };

    const insertLink = () => {
        const url = prompt('Digite a URL:');
        if (url) {
            execCommand('createLink', url);
        }
    };

    const insertImage = () => {
        const url = prompt('Digite a URL da imagem:');
        if (url) {
            execCommand('insertImage', url);
        }
    };

    const getSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            return selection.getRangeAt(0);
        }
        return null;
    };

    return (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            {/* Toolbar */}
            <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap gap-1">
                {/* Text Formatting */}
                <div className="flex gap-1 border-r border-slate-300 pr-2">
                    <button
                        type="button"
                        onClick={() => execCommand('bold')}
                        className="p-2 hover:bg-slate-200 rounded transition-colors"
                        title="Negrito (Ctrl+B)"
                    >
                        <Icons.Bold size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCommand('italic')}
                        className="p-2 hover:bg-slate-200 rounded transition-colors"
                        title="Itálico (Ctrl+I)"
                    >
                        <Icons.Italic size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCommand('underline')}
                        className="p-2 hover:bg-slate-200 rounded transition-colors"
                        title="Sublinhado (Ctrl+U)"
                    >
                        <Icons.Underline size={16} />
                    </button>
                </div>

                {/* Lists */}
                <div className="flex gap-1 border-r border-slate-300 pr-2">
                    <button
                        type="button"
                        onClick={() => execCommand('insertUnorderedList')}
                        className="p-2 hover:bg-slate-200 rounded transition-colors"
                        title="Lista com marcadores"
                    >
                        <Icons.List size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCommand('insertOrderedList')}
                        className="p-2 hover:bg-slate-200 rounded transition-colors"
                        title="Lista numerada"
                    >
                        <Icons.ListOrdered size={16} />
                    </button>
                </div>

                {/* Alignment */}
                <div className="flex gap-1 border-r border-slate-300 pr-2">
                    <button
                        type="button"
                        onClick={() => execCommand('justifyLeft')}
                        className="p-2 hover:bg-slate-200 rounded transition-colors"
                        title="Alinhar à esquerda"
                    >
                        <Icons.AlignLeft size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCommand('justifyCenter')}
                        className="p-2 hover:bg-slate-200 rounded transition-colors"
                        title="Centralizar"
                    >
                        <Icons.AlignCenter size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCommand('justifyRight')}
                        className="p-2 hover:bg-slate-200 rounded transition-colors"
                        title="Alinhar à direita"
                    >
                        <Icons.AlignRight size={16} />
                    </button>
                </div>

                {/* Insert */}
                <div className="flex gap-1">
                    <button
                        type="button"
                        onClick={insertLink}
                        className="p-2 hover:bg-slate-200 rounded transition-colors"
                        title="Inserir link"
                    >
                        <Icons.Link size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={insertImage}
                        className="p-2 hover:bg-slate-200 rounded transition-colors"
                        title="Inserir imagem"
                    >
                        <Icons.Image size={16} />
                    </button>
                </div>
            </div>

            {/* Editor */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`p-4 min-h-[300px] max-h-[500px] overflow-y-auto focus:outline-none ${!value && !isFocused ? 'text-slate-400' : 'text-slate-900'
                    }`}
                data-placeholder={placeholder}
                style={{
                    lineHeight: '1.6'
                }}
            />

            {/* Helper Text */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                💡 Dica: Use a barra de ferramentas para formatar seu email. Variáveis podem ser inseridas normalmente.
            </div>

            <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
        }
        [contenteditable] a {
          color: #4f46e5;
          text-decoration: underline;
        }
        [contenteditable] img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
        }
        [contenteditable] ul, [contenteditable] ol {
          padding-left: 2rem;
          margin: 0.5rem 0;
        }
        [contenteditable] li {
          margin: 0.25rem 0;
        }
      `}</style>
        </div>
    );
};
