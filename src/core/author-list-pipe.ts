import { Pipe, PipeTransform } from '@angular/core';
import { Author } from '../types';

@Pipe({
  name: 'authorList'
})
export class AuthorListPipe implements PipeTransform {

  transform(authors: Author[]): string {
    if (authors.length === 0) return "no current authors";
    let output = authors[0].name;
    if (authors[0].isCreator || authors.length === 1) output += " (owner)";       

    for (let i = 1; i < authors.length; i++) {
      if (i < authors.length -1){
        output += ", " + authors[i].name;
      } else {
        output += " and " + authors[i].name;
      }
        if (authors[i].isCreator) output += " (owner)";
    }
    return output;
  }
}
