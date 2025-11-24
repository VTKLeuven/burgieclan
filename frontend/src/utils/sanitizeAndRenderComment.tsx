'use client'

import DOMPurify from 'dompurify';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useEffect, useRef } from 'react';

/**
 * Sanitizes HTML content from TipTap editor and renders KaTeX math expressions.
 * 
 * This function:
 * 1. Sanitizes HTML to only allow tags created by TipTap StarterKit and Mathematics extensions
 * 2. Renders KaTeX math expressions (both inline and block)
 * 
 * Allowed tags from TipTap StarterKit:
 * - Text formatting: p, strong, em, s, code, pre, br
 * - Headings: h1, h2
 * - Lists: ul, ol, li
 * - Other: blockquote, hr
 * - Math: span (for mathematics extension)
 * 
 * @param htmlContent - The HTML content from TipTap editor
 * @returns Sanitized HTML string with KaTeX rendered
 */
export function sanitizeCommentHTML(htmlContent: string): string {
    // Configure DOMPurify to only allow tags that TipTap creates
    // Also allow KaTeX-generated tags and attributes
    const cleanHTML = DOMPurify.sanitize(htmlContent, {
        ALLOWED_TAGS: [
            // Text formatting
            'p', 'strong', 'em', 's', 'code', 'pre', 'br',
            // Headings
            'h1', 'h2',
            // Lists
            'ul', 'ol', 'li',
            // Other
            'blockquote', 'hr',
            // Math (TipTap Mathematics uses span elements)
            'span',
            // KaTeX-generated elements
            'math', 'annotation', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'mfrac', 'msup', 'msub', 'munderover', 'mover', 'munder', 'mtable', 'mtr', 'mtd', 'mstyle', 'merror', 'mtext', 'menclose', 'mpadded', 'mphantom', 'mglyph', 'mlabeledtr', 'mlongdiv', 'ms', 'mscarries', 'mscarry', 'msgroup', 'msline', 'msrow', 'mstack', 'maction', 'maligngroup', 'malignmark', 'mmultiscripts', 'mroot', 'mprescripts', 'none',
        ],
        ALLOWED_ATTR: [
            'class', // Needed for math spans, KaTeX classes, and other styling
            'data-math', // TipTap Mathematics data attribute
            'aria-hidden', // KaTeX uses this
            'role', // KaTeX uses this
            'style', // KaTeX may use inline styles
        ],
        // Allow KaTeX-specific attributes
        ADD_ATTR: ['data-math', 'aria-hidden', 'role'],
    });

    return cleanHTML;
}

/**
 * Renders KaTeX math expressions in a container element.
 * 
 * TipTap Mathematics extension stores math in spans with specific classes.
 * This function finds math expressions and renders them using KaTeX.
 * 
 * @param container - The DOM element containing the HTML
 */
export function renderKaTeXInElement(container: HTMLElement): void {
    // First, handle TipTap Mathematics extension spans with specific classes
    const mathElements = container.querySelectorAll('span[class*="mathematics"], span[data-math]');
    
    mathElements.forEach((element) => {
        // Get the LaTeX content - it might be in textContent or data-math attribute
        const latexContent = element.getAttribute('data-math') || element.textContent || '';
        
        if (!latexContent.trim()) {
            return;
        }

        try {
            // Check if it's block math (starts and ends with $$) or inline math (starts and ends with $)
            const trimmed = latexContent.trim();
            const isBlockMath = trimmed.startsWith('$$') && trimmed.endsWith('$$');
            const isInlineMath = trimmed.startsWith('$') && trimmed.endsWith('$') && !isBlockMath;
            
            let mathContent = trimmed;
            
            // Remove $ delimiters
            if (isBlockMath) {
                mathContent = mathContent.slice(2, -2).trim();
            } else if (isInlineMath) {
                mathContent = mathContent.slice(1, -1).trim();
            } else {
                // If no delimiters, assume it's already the math content
                mathContent = trimmed;
            }
            
            if (!mathContent) {
                return;
            }

            // Render with KaTeX
            const displayMode = isBlockMath;
            const rendered = katex.renderToString(mathContent, {
                throwOnError: false,
                displayMode: displayMode,
            });
            
            // Replace the content with rendered KaTeX
            element.innerHTML = rendered;
        } catch (error) {
            // If rendering fails, leave the original content
            console.warn('Failed to render KaTeX:', error);
        }
    });

    // Also handle math expressions stored as plain text with $ delimiters
    // Process text nodes to find and render math expressions
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                // Skip if parent is a script, style, or already processed math element
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') {
                    return NodeFilter.FILTER_REJECT;
                }
                // Skip if parent is already a math element
                if (parent.classList.contains('katex') || parent.querySelector('.katex')) {
                    return NodeFilter.FILTER_REJECT;
                }
                // Only process text nodes that might contain math
                const text = node.textContent || '';
                if (text.includes('$')) {
                    return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_REJECT;
            }
        }
    );
    
    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) {
            textNodes.push(node as Text);
        }
    }
    
    // Process each text node
    textNodes.forEach((textNode) => {
        const parent = textNode.parentElement;
        if (!parent) return;
        
        const text = textNode.textContent || '';
        if (!text.includes('$')) return;
        
        // Match block math: $$...$$
        const blockMathRegex = /\$\$([^$]+?)\$\$/g;
        // Match inline math: $...$ (but not $$)
        const inlineMathRegex = /(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g;
        
        const parts: Array<string | { type: 'inline' | 'block'; content: string }> = [];
        let lastIndex = 0;
        
        // Collect all math matches
        const matches: Array<{ start: number; end: number; type: 'inline' | 'block'; content: string }> = [];
        
        // Find block math first
        let match;
        while ((match = blockMathRegex.exec(text)) !== null) {
            matches.push({
                start: match.index,
                end: match.index + match[0].length,
                type: 'block',
                content: match[1].trim(),
            });
        }
        
        // Find inline math (but skip if inside block math)
        while ((match = inlineMathRegex.exec(text)) !== null) {
            const isInsideBlock = matches.some(
                (m) => match!.index >= m.start && match!.index < m.end
            );
            if (!isInsideBlock) {
                matches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    type: 'inline',
                    content: match[1].trim(),
                });
            }
        }
        
        // Sort matches by start position
        matches.sort((a, b) => a.start - b.start);
        
        if (matches.length === 0) return;
        
        // Build parts array
        matches.forEach((mathMatch) => {
            if (mathMatch.start > lastIndex) {
                parts.push(text.substring(lastIndex, mathMatch.start));
            }
            parts.push({ type: mathMatch.type, content: mathMatch.content });
            lastIndex = mathMatch.end;
        });
        
        if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex));
        }
        
        // Replace text node with rendered content
        const fragment = document.createDocumentFragment();
        parts.forEach((part) => {
            if (typeof part === 'string') {
                if (part) {
                    fragment.appendChild(document.createTextNode(part));
                }
            } else {
                try {
                    const span = document.createElement('span');
                    span.innerHTML = katex.renderToString(part.content, {
                        throwOnError: false,
                        displayMode: part.type === 'block',
                    });
                    fragment.appendChild(span);
                } catch (error) {
                    // If rendering fails, keep the original text with delimiters
                    const delimiter = part.type === 'block' ? '$$' : '$';
                    fragment.appendChild(document.createTextNode(`${delimiter}${part.content}${delimiter}`));
                }
            }
        });
        
        parent.replaceChild(fragment, textNode);
    });
}

/**
 * React hook that sanitizes HTML content and renders KaTeX math expressions.
 * 
 * @param htmlContent - The HTML content to sanitize and render
 * @returns Object with sanitized HTML and a ref to attach to the container element
 */
export function useSanitizedComment(htmlContent: string) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sanitizedHTML = sanitizeCommentHTML(htmlContent);

    useEffect(() => {
        if (containerRef.current) {
            // Render KaTeX after the HTML is inserted
            renderKaTeXInElement(containerRef.current);
        }
    }, [sanitizedHTML]);

    return {
        sanitizedHTML,
        containerRef,
    };
}

