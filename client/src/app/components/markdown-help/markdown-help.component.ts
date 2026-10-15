import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-markdown-help',
  standalone: false,
  templateUrl: './markdown-help.component.html',
  styleUrls: ['./markdown-help.component.css'],
})
export class MarkdownHelpComponent {
  @Input({ required: true }) referenceId = '';
  expanded = false;
  readonly examples = [
    { label: 'Heading', syntax: '# Heading', preview: '<strong>Heading</strong>' },
    { label: 'Bold & italic', syntax: '**bold** and *italic*', preview: '<strong>bold</strong> and <em>italic</em>' },
    { label: 'Bullet list', syntax: '- First item\n- Second item', preview: '<ul><li>First item</li><li>Second item</li></ul>' },
    { label: 'Numbered list', syntax: '1. First item\n2. Second item', preview: '<ol><li>First item</li><li>Second item</li></ol>' },
    { label: 'Checklist', syntax: '- [ ] To do\n- [x] Done', preview: '☐ To do<br>☑ Done' },
    { label: 'Link', syntax: '[Website](https://example.com)', preview: '<u>Website</u>' },
    { label: 'Inline code', syntax: '`code`', preview: '<code>code</code>' },
    { label: 'Code block', syntax: '```\ncode here\n```', preview: '<pre><code>code here</code></pre>' },
    { label: 'Quote', syntax: '> A useful note', preview: '<blockquote>A useful note</blockquote>' },
  ];
}
