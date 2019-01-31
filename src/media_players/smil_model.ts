import { MediaOverlay } from './media_overlay';
import { resolveContentRef } from './helpers';

//  LauncherOSX
//
//  Created by Boris Schneiderman.
// Modified by Daniel Weck
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
 * Wrapper of a SmilNode object
 *
 * @class      Smil.SmilNode
 * @constructor
 * @param      {Smil.SmilNode} parent Parent node of the new smil node
 */

class SmilNode {
  public mo: MediaOverlay;
  public spineItemId: number;
  public nodeType: string;
  public parent: any;
  public children?: any[];
  public index?: number;
  public id: string = '';
  protected smilVersion: string;

  constructor(parent: SmilNode) {
    this.parent  = parent;
  }

  /**
   * Finds the smil model object, i.e. the root node of the smil tree
   *
   * @method     getSmil
   * @return     {Smil.SmilModel} node The smil model object
   */

  public getSmil(): any {
    // tslint:disable-next-line:no-this-assignment
    let node = <any> this;
    while (node.parent) {
      node = node.parent;
    }

    return node;
  }

  /**
   * Checks if the node given as a parameter is an ancestor of the current node
   *
   * @method     hasAncestor
   * @param      {Smil.SmilNode} node The checked node
   * @return     {Bool} true if the parameter node is an ancestor
   */

  public hasAncestor(node: SmilNode): boolean {
    let parent = this.parent;
    while (parent) {
      if (parent === node) {
        return true;
      }

      parent = parent.parent;
    }

    return false;
  }
}

/**
 * Wrapper of a time container (smil) node
 *
 * @class      Smil.TimeContainerNode
 * @constructor
 * @param      {Smil.SmilNode} parent Parent smil node
 */

class TimeContainerNode extends SmilNode {
  /**
   * The parent node
   *
   * @property parent
   * @type Smil.SmilNode
   */

  public parent: SmilNode;

  /**
   * The children nodes
   *
   * @property children
   * @type undefined
   */

  public children?: any[];

  /**
   * The index
   *
   * @property index
   * @type undefined
   */

  public index?: number;

  /**
   * The epub type
   *
   * @property epubtype
   * @type String
   */

  public epubtype: string = '';

  constructor(parent: SmilNode) {
    super(parent);
  }

  /**
   * Checks if the smil node is escapable.
   *
   * @method     isEscapable
   * @param      {Array} userEscapables
   * @return     {Bool} true if the smil node is escapable
   */

  public isEscapable(userEscapables: []): boolean {
    if (this.epubtype === '') {
      return false;
    }

    const smilModel = this.getSmil();
    if (!smilModel.mo) {
      return false;
    }

    let arr = smilModel.mo.escapables;
    if (userEscapables.length > 0) {
      arr = userEscapables;
    }

    for (let i = 0; i < arr.length; i += 1) {
      if (this.epubtype.indexOf(arr[i]) >= 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Checks is the smil node is skippable
   *
   * @method     isSkippables
   * @param      {Array} userSkippables
   * @return     {Bool} true s the smil node is skippable
   */

  public isSkippable(userSkippables: []): boolean {
    if (this.epubtype === '') {
      return false;
    }

    const smilModel = this.getSmil();
    if (!smilModel.mo) {
      return false;
    }

    let arr = smilModel.mo.skippables;
    if (userSkippables.length > 0) {
      arr = userSkippables;
    }

    for (let i = 0; i < arr.length; i += 1) {
      if (this.epubtype.indexOf(arr[i]) >= 0) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Looks for the media parent folder
 *
 * @class      Smil.MediaNode
 * @constructor
 * @param      {Smil.SmilNode} parent Parent smil node
 */

class MediaNode extends SmilNode {

  /**
   * The parent node
   *
   * @property parent
   * @type Smil.SmilNode
   */

  public parent: any;

  /**
   * The source locator
   *
   * @property src
   * @type String
   */

  public src?: string = '';
}

/**
 * Node Sequence
 *
 * @class      Smil.SeqNode
 * @constructor
 * @param      {Smil.SmilNode} parent Parent smil node
 */

export class SeqNode extends TimeContainerNode {

  /**
   * The parent node
   *
   * @property parent
   * @type Smil.SmilNode
   */

  public parent: SmilNode;

  /**
   * The children nodes
   *
   * @property children
   * @type Array
   */

  public children: ParNode[] | SeqNode[] = [];

  /**
   * The node type (seq)
   *
   * @property nodeType
   * @type String
   */

  public nodeType: string = 'seq';

  /**
   * The text reference
   *
   * @property textref
   * @type String
   */

  private textref: string = '';

  public element?: any;

  constructor(parent: SmilNode) {
    super(parent);
  }

  /**
   * Calculates the total duration of audio clips
   *
   * @method     durationMilliseconds
   * @return     {Number}
   */

  public durationMilliseconds(): number {
    // returns the smil object
    const smilData = this.getSmil();

    let total = 0;

    for (let i = 0; i < this.children.length; i += 1) {
      let container = this.children[i];
      if (container.nodeType === 'par') {
        container = <ParNode> container;
        if (!container.audio) {
          continue;
        }
        if (
          container.text &&
          (!container.text.manifestItemId ||
            container.text.manifestItemId !== smilData.spineItemId)
        ) {
          continue;
        }

        const clipDur = container.audio.clipDurationMilliseconds();
        total += clipDur;
      } else if (container.nodeType === 'seq') {
        container = <SeqNode> container;
        total += container.durationMilliseconds();
      }
    }

    return total;
  }

  /**
   * Looks for a given parallel node in the current sequence node and its children.
   *  Returns true if found.
   *
   * @method     clipOffset
   * @param      {Number} offset
   * @param      {Smil.ParNode} par The reference parallel smil node
   * @return     {Boolean}
   */

  public clipOffset(offset: any, par: ParNode): boolean {
    const smilData = this.getSmil();

    for (let i = 0; i < this.children.length; i += 1) {
      let container = this.children[i];
      if (container.nodeType === 'par') {
        container = <ParNode> container;
        if (container === par) {
          return true;
        }

        if (!container.audio) {
          continue;
        }

        if (
          container.text &&
          (!container.text.manifestItemId ||
            container.text.manifestItemId !== smilData.spineItemId)
        ) {
          continue;
        }

        const clipDur = container.audio.clipDurationMilliseconds();
        offset.offset += clipDur;
      } else if (container.nodeType === 'seq') {
        container = <SeqNode> container;
        const found = container.clipOffset(offset, par);
        if (found) {
          return true;
        }
      }
    }

    return false;
  }

   /**
   * Checks if a parallel smil node exists at a given timecode in the smil sequence node.
   * Returns the node or undefined.
   *
   * @method     parallelAt
   * @param      {Number} timeMilliseconds
   * @return     {Smil.ParNode}
   */

  public parallelAt(timeMilliseconds: number): ParNode | undefined {
    const smilData = this.getSmil();

    let offset = 0;

    for (let i = 0; i < this.children.length; i += 1) {
      const timeAdjusted = timeMilliseconds - offset;

      let container = this.children[i];

      // looks for a winning parallel smil node in a child parallel smil node
      if (container.nodeType === 'par') {
        container = <ParNode> container;
        // the parallel node must contain an audio clip and a text node with a proper id
        if (!container.audio) {
          continue;
        }

        if (
          container.text &&
          (!container.text.manifestItemId ||
            container.text.manifestItemId !== smilData.spineItemId)
        ) {
          continue;
        }
        // and the timecode given as a parameter must correspond to the audio clip time range
        const clipDur = container.audio.clipDurationMilliseconds();

        if (clipDur > 0 && timeAdjusted <= clipDur) {
          return container;
        }

        offset += clipDur;
      // looks for a winning parallel smil node in a child sequence smil node
      } else if (container.nodeType === 'seq') {
        container = <SeqNode> container;
        const para = container.parallelAt(timeAdjusted);
        if (para) {
          return para;
        }

        offset += container.durationMilliseconds();
      }
    }

    return undefined;
  }

  /**
   * Looks for the nth parallel smil node in the current sequence node
   *
   * @method     nthParallel
   * @param      {Number} index
   * @param      {Number} count
   * @return     {Smil.ParNode}
   */

  public nthParallel(index: number, count: any): ParNode | undefined {
    for (let i = 0; i < this.children.length; i += 1) {
      let container = this.children[i];

      if (container.nodeType === 'par') {
        container = <ParNode> container;
        count.count += 1;

        if (count.count === index) {
          return container;
        }
      } else if (container.nodeType === 'seq') {
        container = <SeqNode> container;
        const para = container.nthParallel(index, count);
        if (para) {
          return para;
        }
      }
    }

    return undefined;
  }
}

/**
 * Returns the parent of the SMIL file by checking out the nodes
 *
 * @class      Smil.ParNode
 * @constructor
 * @param      {Smil.SmilNode} parent Parent smil node

 */

export class ParNode extends TimeContainerNode {

  /**
   * The parent node
   *
   * @property parent
   * @type Smil.SmilNode
   */

  public parent: ParNode;

  /**
   * The children files
   *
   * @property children
   * @type Array
   */

  public children: ParNode[] | AudioNode[] = [];

  /**
   * The Node Type
   *
   * @property nodeType which is equal to "par" here
   * @type String
   */

  public nodeType: string = 'par';

  /**
   * Some text
   *
   * @property text
   * @type String
   */

  public text?: any;

  /**
   * Some audio
   *
   * @property audio
   * @type unknown
   */

  public audio?: AudioNode;

  /**
   * An element of the epub archive
   *
   * @property element
   * @type unknown
   */

  public element?: any;

  public cfi: any;

  constructor(parent: SmilNode) {
    super(parent);
  }

  /**
   * Gets the first ancestor sequence with a given epub type, or undefined.
   *
   * @method     getFirstSeqAncestorWithEpubType
   * @param      {String} epubtype
   * @param      {Boolean} includeSelf
   * @return     {Smil.SmilNode}
   */

  public getFirstSeqAncestorWithEpubType(
    epubtype: string,
    includeSelf: boolean,
  ): SmilNode | undefined {
    if (!epubtype) return undefined;

    let parent = includeSelf ? this : this.parent;
    while (parent) {
      if (parent.epubtype && parent.epubtype.indexOf(epubtype) >= 0) {
        return parent; // assert(parent.nodeType === "seq")
      }

      parent = parent.parent;
    }

    return undefined;
  }
}

/**
 * Node Sequence
 *
 * @class      Smil.TextNode
 * @constructor
 * @param      {Smil.SmilNode} parent Parent smil node

 */

class TextNode extends MediaNode {

  /**
   * The parent node
   *
   * @property parent
   * @type Smil.SmilNode
   */

  public parent: TextNode;

  /**
   * The node type, set to "text"
   *
   * @property nodeType
   * @type String
   */

  public nodeType: string = 'text';

  /**
   * The source file
   *
   * @property srcFile
   * @type String
   */

  private srcFile: string = '';

  /**
   * A fragment of the source file ID
   *
   * @property srcFragmentId
   * @type String
   */

  private srcFragmentId: string = '';

  /**
   * The ID of the manifest for the current item
   *
   * @property manifestItemId
   * @type Number
   */

  private manifestItemId?: number;

  constructor(parent: SmilNode) {
    super(parent);
  }

  /**
   * Updates the ID of the manifest for the current media
   *
   * @method     updateMediaManifestItemId
   */

  public updateMediaManifestItemId(): void {
    const smilData = this.getSmil();

    if (!smilData.href || !smilData.href.length) {
      return; // Blank MO page placeholder, no real SMIL
    }

    const src = this.srcFile ? this.srcFile : this.src;
    const ref = resolveContentRef(src, smilData.href);
    const full = smilData.mo.package.resolveRelativeUrlMO(ref);
    for (let j = 0; j < smilData.mo.package.spine.items.length; j += 1) {
      const item = smilData.mo.package.spine.items[j];
      const url = smilData.mo.package.resolveRelativeUrl(item.href);
      if (url === full) {
        this.manifestItemId = item.idref;
        return;
      }
    }

    console.error(`Cannot set the Media ManifestItemId? ${this.src} && ${smilData.href}`);
  }
}

/**
 * Looks for the media parent folder
 *
 * @class      Smil.AudioNode
 * @constructor
 * @param      {Smil.SmilNode} parent Parent smil node
 */

class AudioNode extends MediaNode {

  /**
   * The parent node
   *
   * @property parent
   * @type Smil.SmilNode
   */

  public parent: SmilNode;

  /**
   * The node type, set to "audio"
   *
   * @property nodeType
   * @type String
   */

  public nodeType: string = 'audio';

  /**
   * The clip begin timecode
   *
   * @property clipBegin
   * @type Number
   */

  public clipBegin: any = 0;

  /**
   * The max duration of the audio clip which is almost infinite
   *
   * @property MAX
   * @type Number
   */

  readonly MAX: number = 1234567890.1; // Number.MAX_VALUE - 0.1; //Infinity;

  /**
   * The clip end timecode
   *
   * @property clipEnd
   * @type Number
   */

  public clipEnd: any = this.MAX;

  constructor(parent: SmilNode) {
    super(parent);
  }

  /**
   * Returns the duration of the audio clip
   *
   * @method     clipDurationMilliseconds
   * @return     {Number}
   */

  public clipDurationMilliseconds(): number {
    const clipBeginMilliseconds = this.clipBegin * 1000;
    const clipEndMilliseconds = this.clipEnd * 1000;

    if (this.clipEnd >= this.MAX || clipEndMilliseconds <= clipBeginMilliseconds) {
      return 0;
    }

    return clipEndMilliseconds - clipBeginMilliseconds;
  }
}

/**
 * Wrapper of the SmilModel object
 *
 * @class      Models.SmilModel
 * @constructor
 */

export class SmilModel {

  /**
   * The parent object
   *
   * @property parent
   * @type any
   */

  public parent: SeqNode | ParNode;

  /**
   * The smil model children, i.e. a collection of seq or par smil nodes
   *
   * @property children
   * @type Array
   */

  public children: SeqNode[] | ParNode[] = [];

  /**
   * The manifest item ID
   *
   * @property id
   * @type Number
   */

  public id?: number;

  /**
   * The href of the .smil source file
   *
   * @property href
   * @type String
   */

  private href?: string;

  /**
   * The duration of the audio clips
   *
   * @property duration
   * @type Number
   */

  public duration?: any;

  /**
   * The media overlay object
   *
   * @property mo
   * @type Models.MediaOverlay
   */

  private mo?: MediaOverlay;

  public smilVersion: string;

  public spineItemId: number;

  private epubtypeSyncs: string[] = [];

  public nodeType: string;

  public index: number;

  constructor() {
  }

  /**
   * Checks if a parallel smil node exists at a given timecode in the smil model.
   * Returns the node or undefined.
   *
   * @method     parallelAt
   * @param      {Number} timeMillisecond
   * @return     {Smil.ParNode}
   */

  public parallelAt(timeMilliseconds: number): ParNode | undefined {
    const firstChild = <SeqNode> this.children[0];
    return firstChild.parallelAt(timeMilliseconds);
  }

  /**
   * Looks for the nth parallel smil node in the current smil model
   *
   * @method     nthParallel
   * @param      {Number} index
   * @return     {Smil.ParNode}
   */

  public nthParallel(index: number): ParNode | undefined {
    const count = { count: -1 };
    const firstChild = <SeqNode> this.children[0];
    return firstChild.nthParallel(index, count);
  }

  /**
   * Looks for a given parallel node in the current smil model.
   *  Returns its offset if found.
   *
   * @method     clipOffset
   * @param      {Smil.ParNode} par The reference parallel smil node
   * @return     {Number} offset of the audio clip
   */

  public clipOffset(par: ParNode): number {
    const offset = { offset: 0 };
    const firstChild = <SeqNode> this.children[0];
    if (firstChild.clipOffset(offset, par)) {
      return offset.offset;
    }

    return 0;
  }

  /**
   * Calculates the total audio duration of the smil model
   *
   * @method     durationMilliseconds_Calculated
   * @return     {Number}
   */

  public durationMilliseconds_Calculated(): number {
    const firstChild = <SeqNode> this.children[0];
    return firstChild.durationMilliseconds();
  }

  // local function, helper
  private hasSync(epubtype: string): boolean {
    for (let i = 0; i < this.epubtypeSyncs.length; i += 1) {
      if (this.epubtypeSyncs[i] === epubtype) {
        return true;
      }
    }

    return false;
  }

  /**
   * Stores epub types given as parameters in the epubtypeSyncs array
   * Note: any use of the epubtypeSyncs array?
   *
   * @method     addSync
   * @param      {String} epubtypes
   */

  public addSync(epubtypes: string): void {
    if (!epubtypes) return;

    const parts = epubtypes.split(' ');
    for (let i = 0; i < parts.length; i += 1) {
      const epubtype = parts[i].trim();

      if (epubtype.length > 0 && !this.hasSync(epubtype)) {
        this.epubtypeSyncs.push(epubtype);
      }
    }
  }

  /**
   * Static SmilModel.fromSmilDTO method, returns a clean SmilModel object
   *
   * @method      Model.fromSmilDTO
   * @param      {string} smilDTO
   * @param      {string} parent
   * @return {Models.SmilModel}
  */

  public static fromSmilDTO(smilDTO: SmilModel, mo: MediaOverlay): SmilModel {

    if (mo.DEBUG) {
      console.debug('Media Overlay DTO import...');
    }

    // Debug level indenting function
    let indent = 0;
    const getIndent = () => {
      let str = '';
      for (let i = 0; i < indent; i += 1) {
        str += '   ';
      }
      return str;
    };

    const smilModel = new SmilModel();
    smilModel.id = smilDTO.id;
    smilModel.spineItemId = smilDTO.spineItemId;
    smilModel.href = smilDTO.href;

    smilModel.smilVersion = smilDTO.smilVersion;

    smilModel.duration = smilDTO.duration;
    if (smilModel.duration !== undefined && smilModel.duration.length
      && smilModel.duration.length > 0
    ) {
      console.error(`SMIL duration is string, parsing float... (${smilModel.duration})`);
      smilModel.duration = parseFloat(smilModel.duration);
    }

    smilModel.mo = mo; // Models.MediaOverlay

    if (smilModel.mo.DEBUG) {
      console.log(`JS MO smilVersion=${smilModel.smilVersion}`);
      console.log(`JS MO id=${smilModel.id}`);
      console.log(`JS MO spineItemId=${smilModel.spineItemId}`);
      console.log(`JS MO href=${smilModel.href}`);
      console.log(`JS MO duration=${smilModel.duration}`);
    }

    // Safe copy, helper function
    const safeCopyProperty = (
      property: string,
      from: any,
      to: any,
      isRequired?: boolean,
    ) => {
      if ((property in from)) {
        if (!(property in to)) {
          console.debug(`property ${property} not declared in smil node ${to.nodeType}`);
        }

        to[property] = from[property];

        if (smilModel && smilModel.mo && smilModel.mo.DEBUG) {
          console.log(`${getIndent()}JS MO: [${property}=${to[property]}]`);
        }
      } else if (isRequired) {
        console.log(`Required property ${property} not found in smil node ${from.nodeType}`);
      }
    };

    // smil node creation, helper function
    const createNodeFromDTO = (nodeDTO: any, parent: any) => {
      let node;

      if (nodeDTO.nodeType === 'seq') {
        if (smilModel.mo && smilModel.mo.DEBUG) {
          console.log(`${getIndent()}JS MO seq`);
        }

        node = new SeqNode(parent);

        safeCopyProperty('textref', nodeDTO, node, ((parent && parent.parent) ? true : false));
        safeCopyProperty('id', nodeDTO, node);
        safeCopyProperty('epubtype', nodeDTO, node);

        if (node.epubtype) {
          node.getSmil().addSync(node.epubtype);
        }

        indent += 1;
        copyChildren(nodeDTO, node);
        indent -= 1;
      } else if (nodeDTO.nodeType === 'par') {
        if (smilModel.mo && smilModel.mo.DEBUG) {
          console.log(`${getIndent()}JS MO par`);
        }

        node = new ParNode(parent);

        safeCopyProperty('id', nodeDTO, node);
        safeCopyProperty('epubtype', nodeDTO, node);

        if (node.epubtype) {
          node.getSmil().addSync(node.epubtype);
        }

        indent += 1;
        copyChildren(nodeDTO, node);
        indent -= 1;

        for (let i = 0, count = node.children.length; i < count; i += 1) {
          const child = node.children[i];
          if (child.nodeType === 'text') {
            node.text = child;
          } else if (child.nodeType === 'audio') {
            node.audio = <AudioNode> child;
          } else {
            console.error(`Unexpected smil node type: ${child.nodeType}`);
          }
        }

        ////////////////
        const forceTTS = false; // for testing only!
        ////////////////

        if (forceTTS || !node.audio) {
          // synthetic speech (playback using TTS engine), or embedded media, or blank page
          const fakeAudio = new AudioNode(node);

          fakeAudio.clipBegin = 0;
          fakeAudio.clipEnd = fakeAudio.MAX;
          fakeAudio.src = undefined;

          node.audio = fakeAudio;
        }
      } else if (nodeDTO.nodeType === 'text') {
        if (smilModel.mo && smilModel.mo.DEBUG) {
          console.log(`${getIndent()}JS MO text`);
        }

        node = new TextNode(parent);

        safeCopyProperty('src', nodeDTO, node, true);
        safeCopyProperty('srcFile', nodeDTO, node, true);
        safeCopyProperty('srcFragmentId', nodeDTO, node, false);
        safeCopyProperty('id', nodeDTO, node);

        node.updateMediaManifestItemId();
      } else if (nodeDTO.nodeType === 'audio') {
        if (smilModel.mo && smilModel.mo.DEBUG) {
          console.log(`${getIndent()}JS MO audio`);
        }

        node = new AudioNode(parent);

        safeCopyProperty('src', nodeDTO, node, true);
        safeCopyProperty('id', nodeDTO, node);

        safeCopyProperty('clipBegin', nodeDTO, node);
        if (node.clipBegin && node.clipBegin.length && node.clipBegin.length > 0) {
          console.error(`SMIL clipBegin is string, parsing float... (${node.clipBegin})`);
          node.clipBegin = parseFloat(node.clipBegin);
        }
        if (node.clipBegin < 0) {
          if (smilModel.mo && smilModel.mo.DEBUG) {
            console.log(`${getIndent()}JS MO clipBegin adjusted to ZERO`);
          }
          node.clipBegin = 0;
        }

        safeCopyProperty('clipEnd', nodeDTO, node);
        if (node.clipEnd && node.clipEnd.length && node.clipEnd.length > 0) {
          console.error(`SMIL clipEnd is string, parsing float... (${node.clipEnd})`);
          node.clipEnd = parseFloat(node.clipEnd);
        }
        if (node.clipEnd <= node.clipBegin) {
          if (smilModel.mo && smilModel.mo.DEBUG) {
            console.log(`${getIndent()}JS MO clipEnd adjusted to MAX`);
          }
          node.clipEnd = node.MAX;
        }
      } else {
        console.error(`Unexpected smil node type: ${nodeDTO.nodeType}`);
        return undefined;
      }

      return node;
    };

    // recursive copy of a tree, helper function
    const copyChildren = (from: any, to: any) => {
      const count = from.children.length;
      for (let i = 0; i < count; i += 1) {
        const node = createNodeFromDTO(from.children[i], to);
        if (node) {
          node.index = i;
          to.children.push(node);
        }
      }
    };

    copyChildren(smilDTO, smilModel);

    return smilModel;
  }
}
