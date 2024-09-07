/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import styles from '../editor.module.css';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {TreeView} from '@lexical/react/LexicalTreeView';

export default function TreeViewPlugin(): JSX.Element {
    const [editor] = useLexicalComposerContext();
    return (
        <TreeView
            viewClassName={styles.treeViewOutput}
            treeTypeButtonClassName={styles.debugTreeypeButton}
            timeTravelPanelClassName={styles.debugTimetravelPanel}
            timeTravelButtonClassName={styles.debugTimetravelButton}
            timeTravelPanelSliderClassName={styles.debugTimetravelPanelSlider}
            timeTravelPanelButtonClassName={styles.debugTimetravelPanelButton}
            editor={editor}
        />
    );
}

