//  LauncherOSX
//
//  Created by Boris Schneiderman.
//  Copyright (c) 2014 Readium Foundation and/or its licensees. All rights reserved.
//
//  Redistribution and use in source and binary forms, with or without modification,
//  are permitted provided that the following conditions are met:
//  1. Redistributions of source code must retain the above copyright notice, this
//  list of conditions and the following disclaimer.
//  2. Redistributions in binary form must reproduce the above copyright notice,
//  this list of conditions and the following disclaimer in the documentation and/or
//  other materials provided with the distribution.
//  3. Neither the name of the organization nor the names of its contributors may be
//  used to endorse or promote products derived from this software without specific
//  prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
//  ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
//  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
//  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
//  BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
//  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
//  OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
//  OF THE POSSIBILITY OF SUCH DAMAGE.

/**
 *
 * @param contentRef
 * @param sourceFileHref
 * @returns {string}
 * @constructor
 */
export function resolveContentRef(contentRef: string = '', sourceFileHref: string): string {

  if (!sourceFileHref) {
    return contentRef;
  }

  const sourceParts = sourceFileHref.split('/');
  // remove source file name
  sourceParts.pop();

  const pathComponents = contentRef.split('/');

  while (sourceParts.length > 0 && pathComponents[0] === '..') {
    sourceParts.pop();
    pathComponents.splice(0, 1);
  }

  const combined = sourceParts.concat(pathComponents);

  return combined.join('/');
}

// TODO: consider using CSSOM escape() or polyfill
// https://github.com/mathiasbynens/CSS.escape/blob/master/css.escape.js
// http://mathiasbynens.be/notes/css-escapes
/**
 *
 * @param sel
 * @returns {string}
 */
export function escapeJQuerySelector(sel: string): any {
  // http://api.jquery.com/category/selectors/
  // !"#$%&'()*+,./:;<=>?@[\]^`{|}~
  // double backslash escape

  if (!sel) return undefined;

  const selector = sel.replace(/([;&,\.\+\*\~\?':"\!\^#$%@\[\]\(\)<=>\|\/\\{}`])/g, '\\$1');

  return selector;
}
