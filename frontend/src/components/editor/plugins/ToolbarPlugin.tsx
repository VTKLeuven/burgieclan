/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import styles from '../editor.module.css';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {
    $getSelection,
    $isRangeSelection,
    CAN_REDO_COMMAND,
    CAN_UNDO_COMMAND,
    FORMAT_ELEMENT_COMMAND,
    FORMAT_TEXT_COMMAND,
    REDO_COMMAND,
    SELECTION_CHANGE_COMMAND,
    UNDO_COMMAND,
} from 'lexical';
import {useCallback, useEffect, useRef, useState} from 'react';

const LowPriority = 1;

function Divider() {
    return <div className={styles.divider} />;
}

export default function ToolbarPlugin() {
    const [editor] = useLexicalComposerContext();
    const toolbarRef = useRef(null);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isStrikethrough, setIsStrikethrough] = useState(false);

    const $updateToolbar = useCallback(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            // Update text format
            setIsBold(selection.hasFormat('bold'));
            setIsItalic(selection.hasFormat('italic'));
            setIsUnderline(selection.hasFormat('underline'));
            setIsStrikethrough(selection.hasFormat('strikethrough'));
        }
    }, []);

    useEffect(() => {
        return mergeRegister(
            editor.registerUpdateListener(({editorState}) => {
                editorState.read(() => {
                    $updateToolbar();
                });
            }),
            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                (_payload, _newEditor) => {
                    $updateToolbar();
                    return false;
                },
                LowPriority,
            ),
            editor.registerCommand(
                CAN_UNDO_COMMAND,
                (payload) => {
                    setCanUndo(payload);
                    return false;
                },
                LowPriority,
            ),
            editor.registerCommand(
                CAN_REDO_COMMAND,
                (payload) => {
                    setCanRedo(payload);
                    return false;
                },
                LowPriority,
            ),
        );
    }, [editor, $updateToolbar]);

    return (
        <div className={styles.toolbar} ref={toolbarRef}>
            <button
                disabled={!canUndo}
                onClick={() => {
                    editor.dispatchCommand(UNDO_COMMAND, undefined);
                }}
                className={`${styles.toolbarItem} ${styles.toolbarItemSpaced}`}
                aria-label="Undo">
                <i className={`${styles.icon} ${styles.iconUndo}`} />
            </button>
            <button
                disabled={!canRedo}
                onClick={() => {
                    editor.dispatchCommand(REDO_COMMAND, undefined);
                }}
                className={styles.toolbarItem}
                aria-label="Redo">
                <i className={`${styles.icon} ${styles.iconRedo}`} />
            </button>
            <Divider />
            <button
                onClick={() => {
                    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
                }}
                className={`${styles.toolbarItem} ${styles.toolbarItemSpaced} ${isBold ? styles.toolbarItemActive : ''}`}
                aria-label="Format Bold">
                <i className={`${styles.icon} ${styles.iconBold}`} />
            </button>
            <button
                onClick={() => {
                    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
                }}
                className={`${styles.toolbarItem} ${styles.toolbarItemSpaced} ${isItalic ? styles.toolbarItemActive : ''}`}
                aria-label="Format Italics">
                <i className={`${styles.icon} ${styles.iconItalic}`} />
            </button>
            <button
                onClick={() => {
                    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
                }}
                className={`${styles.toolbarItem} ${styles.toolbarItemSpaced} ${isUnderline ? styles.toolbarItemActive : ''}`}
                aria-label="Format Underline">
                <i className={`${styles.icon} ${styles.iconUnderline}`} />
            </button>
            <button
                onClick={() => {
                    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
                }}
                className={`${styles.toolbarItem} ${styles.toolbarItemSpaced} ${isStrikethrough ? styles.toolbarItemActive : ''}`}
                aria-label="Format Strikethrough">
                <i className={`${styles.icon} ${styles.iconStrikethrough}`} />
            </button>
            <Divider />
            <button
                onClick={() => {
                    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
                }}
                className={`${styles.toolbarItem} ${styles.toolbarItemSpaced}`}
                aria-label="Left Align">
                <i className={`${styles.icon} ${styles.iconLeftAlign}`} />
            </button>
            <button
                onClick={() => {
                    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
                }}
                className={`${styles.toolbarItem} ${styles.toolbarItemSpaced}`}
                aria-label="Center Align">
                <i className={`${styles.icon} ${styles.iconCenterAlign}`} />
            </button>
            <button
                onClick={() => {
                    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
                }}
                className={`${styles.toolbarItem} ${styles.toolbarItemSpaced}`}
                aria-label="Right Align">
                <i className={`${styles.icon} ${styles.iconRightAlign}`} />
            </button>
            <button
                onClick={() => {
                    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
                }}
                className={styles.toolbarItem}
                aria-label="Justify Align">
                <i className={`${styles.icon} ${styles.iconJustifyAlign}`} />
            </button>{' '}
        </div>
    );
}
