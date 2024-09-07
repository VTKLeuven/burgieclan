'use client'

import styles from './editor.module.css'

import {$getRoot, $getSelection} from 'lexical';
import {useEffect} from 'react';

import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import EditorTheme from "@/components/editor/EditorTheme";
import {CheckListPlugin} from "@lexical/react/LexicalCheckListPlugin";
import {TablePlugin} from "@lexical/react/LexicalTablePlugin";
import {TabIndentationPlugin} from "@lexical/react/LexicalTabIndentationPlugin";
import {OnChangePlugin} from "@lexical/react/LexicalOnChangePlugin";

const placeholder = 'Enter something...';

const editorConfig = {
    namespace: 'Burgieclan Editor',
    nodes: [],
    // Handling of errors during update
    onError(error: Error) {
        throw error;
    },
    // The editor theme
    theme: EditorTheme,
};

// LexicalOnChangePlugin notifies about changes
function onChange(editorState) {
    editorState.read(() => {
        // Read the contents of the EditorState here.
        const root = $getRoot();
        const selection = $getSelection();

        console.log(root, selection);
    });
}

const Editor = () => {
    return (
        <LexicalComposer initialConfig={editorConfig}>
            <div className={styles.editorContainer}>
                <ToolbarPlugin />
                <div className={styles.editorInner}>
                    <RichTextPlugin
                        contentEditable={
                            <ContentEditable
                                className={styles.editorInput}
                                aria-placeholder={placeholder}
                                placeholder={
                                    <div className={styles.editorPlaceholder}>{placeholder}</div>
                                }
                            />
                        }
                        ErrorBoundary={LexicalErrorBoundary}
                    />
                    <HistoryPlugin />
                    <AutoFocusPlugin />
                    <TreeViewPlugin />
                    <CheckListPlugin />
                    <TabIndentationPlugin />
                    <OnChangePlugin onChange={onChange} />
                </div>
            </div>
        </LexicalComposer>
    );
}

export default Editor;