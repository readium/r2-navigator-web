import * as EPUBcfi from '@evidentpoint/readium-cfi-js';
import {
  ElementBlacklistedChecker,
  ElementVisibilityChecker,
  IVisibleElementInfo,
} from './element-checker';
import { Rect } from './rect';

export class CfiNavigationLogic {
  private rootDocument: Document;

  private elementChecker: ElementBlacklistedChecker;

  public constructor(doc: Document, eleChecker: ElementBlacklistedChecker) {
    this.rootDocument = doc;
    this.elementChecker = eleChecker;
  }

  public getCfiFromElement(element: Element): string {
    let cfi = EPUBcfi.Generator.generateElementCFIComponent(
                element,
                this.elementChecker.getClassBlacklist(),
                this.elementChecker.getElementBlacklist(),
                this.elementChecker.getIdBlacklist(),
              );

    if (cfi[0] === '!') {
      cfi = cfi.substring(1);
    }

    return cfi;
  }

  public getFirstVisibleCfi(viewport: Rect): string | null {
    const visChecker = new ElementVisibilityChecker(this.rootDocument,
                                                    viewport,
                                                    this.elementChecker);
    const visibleEleInfo = visChecker.findFirstVisibleElement();

    return this.findVisibleLeafNodeCfi(visibleEleInfo, viewport);
  }

  public getPageIndexByCfi(cfi: string, pageDimension: number): number | null {
    if (this.isRangeCfi(cfi)) {
      const range = this.getNodeRangeInfoFromCfi(cfi);
      if (range) {
        return this.getPageIndexFromRange(range, pageDimension);
      }

      return null;
    }

    const ele = this.getElementByCfi(cfi);
    if (ele) {
      return this.getPageIndexFromElement(ele, pageDimension);
    }

    return null;
  }

  public getElementByCfi(cfi: string): Node | null {
    return this.getElementByPartialCfi(cfi);
  }

  public getPageIndexFromElement(ele: Node, pageDimension: number): number | null {
    let pageIndex = this.findPageIndexByRectangles(ele, pageDimension);
    if (pageIndex === null) {
      const visChecker = new ElementVisibilityChecker(this.rootDocument);
      const [nearEle, _] = visChecker.findNearestElement(ele);
      if (nearEle) {
        pageIndex = this.findPageIndexByRectangles(nearEle, pageDimension);
      }
    }

    return pageIndex;
  }

  public getPageIndexFromRange(range: Range, pageDimension: number): number | null {
    const visCheck = new ElementVisibilityChecker(this.rootDocument);
    const offset = visCheck.getRangeStartOffset(range);

    return offset !== null ? Math.floor(offset / pageDimension) : null;
  }

  public isRangeCfi(partialCfi: string): boolean {
    const cfi = this.wrapCfi(partialCfi);

    return EPUBcfi.Interpreter.isRangeCfi(cfi) || EPUBcfi.Interpreter.hasTextTerminus(cfi);
  }

  private findVisibleLeafNodeCfi(visNode: IVisibleElementInfo, viewport: Rect): string | null {
    const element = visNode.element;
    const textNode = visNode.textNode;

    // if a valid text node is found, try to generate a CFI with range offsets
    if (textNode && this.isValidTextNode(textNode)) {
      const visChecker = new ElementVisibilityChecker(this.rootDocument,
                                                      viewport,
                                                      this.elementChecker);
      const visibleRange = visChecker.getVisibleTextRange(textNode, true);

      return this.generateCfiFromRange(visibleRange);
    }

    if (element) {
      return this.getCfiFromElement(element);
    }

    return null;
  }

  private isValidTextNode(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      return this.isValidTextNodeContent(node.nodeValue);
    }

    return false;
  }

  private isValidTextNodeContent(text: string | null): boolean {
    if (text === null) {
      return false;
    }

    return !!text.trim().length;
  }

  private generateCfiFromRange(range: Range): string {
    if (range.collapsed && range.startContainer.nodeType === Node.TEXT_NODE) {
      return EPUBcfi.Generator.generateCharacterOffsetCFIComponent(
        range.startContainer, range.startOffset,
        ['cfi-marker'], [], ['MathJax_Message', 'MathJax_SVG_Hidden']);
    }

    if (range.collapsed) {
      return this.getCfiFromElement(<Element>(range.startContainer));
    }

    return EPUBcfi.Generator.generateRangeComponent(
        range.startContainer, range.startOffset,
        range.endContainer, range.endOffset,
        this.elementChecker.getClassBlacklist(),
        this.elementChecker.getElementBlacklist(),
        this.elementChecker.getIdBlacklist());
  }

  private findPageIndexByRectangles(ele: Node, pageDimension: number): number | null {
    const visChecker = new ElementVisibilityChecker(this.rootDocument);
    const offset = visChecker.getElementStartOffset(ele);
    if (offset === null) {
      return null;
    }

    return Math.floor(offset / pageDimension);
  }

  private getElementByPartialCfi(cfi: string): Node | null {
    const wrappedCfi = this.wrapCfi(cfi);
    // tslint:disable-next-line:no-any
    let $element: any;
    try {
      //noinspection JSUnresolvedVariable
      $element = EPUBcfi.Interpreter.getTargetElement(wrappedCfi, this.rootDocument,
                                                      this.elementChecker.getClassBlacklist(),
                                                      this.elementChecker.getElementBlacklist(),
                                                      this.elementChecker.getIdBlacklist());
    } catch (ex) {
      // EPUBcfi.Interpreter can throw a SyntaxError
    }

    if (!$element || $element.length === 0) {
      console.log(`Can't find element for CFI: ${cfi}`);

      return null;
    }

    return $element[0];
  }

  private getNodeRangeInfoFromCfi(cfi: string): Range | null {
    const wrappedCfi = this.wrapCfi(cfi);
    // tslint:disable-next-line:no-any
    let nodeResult: any;
    if (EPUBcfi.Interpreter.isRangeCfi(wrappedCfi)) {
      try {
        //noinspection JSUnresolvedVariable
        nodeResult = EPUBcfi.Interpreter.getRangeTargetElements(
          wrappedCfi, this.rootDocument,
          this.elementChecker.getClassBlacklist(),
          this.elementChecker.getElementBlacklist(),
          this.elementChecker.getIdBlacklist(),
        );
      } catch (ex) {
        // EPUBcfi.Interpreter can throw a SyntaxError
      }

      if (!nodeResult) {
        console.log(`Can't find nodes for range CFI: ${cfi}`);

        return null;
      }

      return this.createRange(nodeResult.startElement, nodeResult.startOffset,
                              nodeResult.endElement, nodeResult.endOffset);
    }

    if (EPUBcfi.Interpreter.hasTextTerminus(wrappedCfi)) {
      // tslint:disable-next-line:no-any
      let textTerminusResult: any;
      try {
        textTerminusResult = EPUBcfi.Interpreter.getTextTerminusInfo(
          wrappedCfi, this.rootDocument,
          this.elementChecker.getClassBlacklist(),
          this.elementChecker.getElementBlacklist(),
          this.elementChecker.getIdBlacklist());
      } catch (ex) {
        // EPUBcfi.Interpreter can throw a SyntaxError
      }

      if (!textTerminusResult) {
        console.log(`Can't find node for text term CFI: ${cfi}`);

        return null;
      }

      return this.createRange(textTerminusResult.textNode, textTerminusResult.textOffset,
                              textTerminusResult.textNode, textTerminusResult.textOffset);

    }

    return null;
  }

  private wrapCfi(partialCfi: string): string {
    return `epubcfi(/99!${partialCfi})`;
  }

  private createRange(startNode: Node, startOffset: number | undefined,
                      endNode: Node, endOffset: number | undefined): Range {
    const range = this.rootDocument.createRange();
    range.setStart(startNode, startOffset ? startOffset : 0);

    if (endNode.nodeType === Node.ELEMENT_NODE) {
      range.setEnd(endNode, endOffset ? endOffset : endNode.childNodes.length);
    } else if (endNode.nodeType === Node.TEXT_NODE) {
      range.setEnd(endNode, endOffset ? endOffset : 0);
    }

    return range;
  }

}
