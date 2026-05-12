import DOMPurify from 'dompurify';

/**
 * Sanitize HTML to prevent XSS attacks.
 * Use this whenever rendering user/teacher-generated HTML via dangerouslySetInnerHTML.
 */
export function sanitizeHtml(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: [
            'p', 'br', 'strong', 'em', 'u', 's', 'b', 'i',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li',
            'a', 'blockquote', 'pre', 'code', 'hr', 'span',
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    });
}
