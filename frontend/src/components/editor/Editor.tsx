'use client'

import styles from './editor.module.css'

import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import EditorTheme from "@/components/editor/EditorTheme";

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
                </div>
            </div>
        </LexicalComposer>
    );
}

export default Editor;