import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';

marked.use({ breaks: true, gfm: true });

@Pipe({ name: 'markdown', standalone: false })
export class MarkdownPipe implements PipeTransform {
  transform(value: string): string {
    const normalised = value.replace(/^(\s*(?:[-*+]|\d+\.)\s+)\[\]/gm, '$1[ ]');
    const html = marked.parse(normalised) as string;
    return html.replace(/<input\b([^>]*)>/g, (match, attrs: string) => {
      if (!/type="checkbox"/.test(attrs)) { return match; }
      const checked = /\schecked(="[^"]*")?/.test(attrs);
      return `<span class="task-checkbox${checked ? ' task-checkbox-checked' : ''}"></span>`;
    });
  }
}
