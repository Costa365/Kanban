import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';

marked.use({ breaks: true, gfm: true });

@Pipe({ name: 'markdown', standalone: false })
export class MarkdownPipe implements PipeTransform {
  transform(value: string): string {
    return marked.parse(value) as string;
  }
}
