import { Rect } from './rect';

export interface IVisibleElementInfo {
  element: HTMLElement | null;
  textNode: Node | null;
  percentVisible: number;
}

export class ElementBlacklistedChecker {
  private classBlacklist: string[];
  private idBlacklist: string[];
  private elementBlacklist: string[];

  public constructor(clsList: string[], idList: string[], eleList: string[]) {
    this.classBlacklist = clsList;
    this.idBlacklist = idList;
    this.elementBlacklist = eleList;
  }

  public getClassBlacklist(): string[] {
    return this.classBlacklist;
  }

  public getIdBlacklist(): string[] {
    return this.idBlacklist;
  }

  public getElementBlacklist(): string[] {
    return this.elementBlacklist;
  }

  public isElementBlacklisted(node: Node | null): boolean {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    const element = <Element>node;
    const clsAttr = element.getAttribute('class');
    const classList = clsAttr ? clsAttr.split(' ') : [];

    for (const className of classList) {
      if (this.classBlacklist.indexOf(className) >= 0) {
        return true;
      }
    }

    const id = element.id;
    if (id && id.length > 0 && this.idBlacklist.indexOf(id) >= 0) {
      return true;
    }

    const eleName = element.tagName.toLowerCase();
    if (this.elementBlacklist.indexOf(eleName) >= 0) {
      return true;
    }

    return false;
  }
}

class NodeIterator {
  private walker: TreeWalker;
  private isForward: boolean;

  public constructor(walker: TreeWalker, isForward: boolean) {
    this.walker = walker;
    this.isForward = isForward;

    if (!this.isForward) {
      while (this.walker.lastChild()) {}
    }
  }

  public next(): Node | null {
    return this.isForward ? this.walker.nextNode() : this.walker.previousNode();
  }
}

export class ElementVisibilityChecker {
  private rootDoc: Document;

  private viewport?: Rect;

  private elementChecker?: ElementBlacklistedChecker;

  private isRtl: boolean = false;

  private columnSize: [number, number] = [0, 0];

  public constructor(doc: Document, columnSize: [number, number],
                     viewport?: Rect, eleChecker?: ElementBlacklistedChecker) {
    this.rootDoc = doc;
    this.columnSize = columnSize;
    this.viewport = viewport;
    this.elementChecker = eleChecker;
  }

  public findFirstVisibleElement(fromEnd: boolean): IVisibleElementInfo {
    const bodyEle = this.rootDoc.body;

    let firstVisibleElement: HTMLElement | null = null;
    let percentVisible = 0;
    let textNode: Node | null = null;

    // tslint:disable-next-line:no-bitwise
    const mask = NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT;
    const filter = (node: Node): number => {
      if (this.elementChecker?.isElementBlacklisted(node)) {
        return NodeFilter.FILTER_REJECT;
      }

      if (this.elementChecker?.isElementBlacklisted(node.parentElement)) {
        return NodeFilter.FILTER_REJECT;
      }

      if (node.nodeType === Node.TEXT_NODE && !this.isValidTextNode(node)) {
        return NodeFilter.FILTER_REJECT;
      }

      const visibilityResult = this.checkVisibility(<HTMLElement>(node), false);

      return visibilityResult ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    };
    const treeWalker = document.createTreeWalker(bodyEle,
                                                 mask,
                                                 { acceptNode: filter },
                                                 false);

    const nodeIter = new NodeIterator(treeWalker, !fromEnd);
    if (!fromEnd && nodeIter.next() === null) {
      return { textNode, percentVisible, element: firstVisibleElement };
    }

    do  {
      const node = treeWalker.currentNode;

      if (node.nodeType === Node.TEXT_NODE) {
        firstVisibleElement = node.parentElement;
        textNode = node;
        percentVisible = 100;
        break;
      }

      let hasChildElements = false;
      let hasChildTextNodes = false;
      for (let i = node.childNodes.length - 1; i >= 0; i -= 1) {
        const childNode = node.childNodes[i];
        if (childNode.nodeType === Node.ELEMENT_NODE) {
          hasChildElements = true;
          break;
        }
        if (childNode.nodeType === Node.TEXT_NODE) {
          hasChildTextNodes = true;
        }
      }

      // potentially stop tree traversal when first element hit with no child element nodes
      if (!hasChildElements && hasChildTextNodes) {
        for (let i = node.childNodes.length - 1; i >= 0; i -= 1) {
          const childNode = node.childNodes[i];
          if (childNode.nodeType === Node.TEXT_NODE && this.isValidTextNode(childNode)) {
            const visibilityResult = this.checkVisibility(childNode, true);
            if (visibilityResult) {
              firstVisibleElement = <HTMLElement>(node);
              textNode = childNode;
              percentVisible = visibilityResult;
              break;
            }
          }
        }
      } else if (!hasChildElements) {
        firstVisibleElement = <HTMLElement>(node);
        percentVisible = 100;
        textNode = null;
        break;
      }
    } while (nodeIter.next());

    return { textNode, percentVisible, element: firstVisibleElement };
  }

  public getVisibleTextRange(textNode: Node, fromEnd: boolean): Range {
    let ranges = this.splitRange(this.createRangeFromNode(textNode));
    const activeIndex = !fromEnd ? 0 : 1;
    const otherIndex = !fromEnd ? 1 : 0;
    while (ranges.length > 1) {
      const currRange = ranges[activeIndex];
      const fragments = this.getRangeRectangles(currRange);
      if (this.calcVisibility(fragments, false) > 0) {
        ranges = this.splitRange(ranges[activeIndex]);
      } else {
        ranges = this.splitRange(ranges[otherIndex]);
      }
    }

    const resultRange = ranges[0];
    if (resultRange) {
      // Always collapse
      resultRange.collapse(true);
    }

    return resultRange;
  }

  public getElementStartOffset(ele: Node): [number, number] | null {
    const rects = this.getNodeRectangles(ele);
    if (rects.length === 0) {
      return null;
    }

    return [rects[0].left, rects[0].top];
  }

  public getRangeStartOffset(range: Range): [number, number] | null {
    const rects = this.getRangeRectangles(range);
    if (rects.length === 0) {
      return null;
    }

    return [rects[0].left, rects[0].top];
  }

  public findNearestElement(ele: Node): [Node | null, boolean] {
    let siblingTextNodesAndSelf;
    if (!ele.parentNode) {
      siblingTextNodesAndSelf = [ele];
    } else {
      siblingTextNodesAndSelf = Array.from(ele.parentNode.childNodes).filter((n) => {
        return n === ele || this.isValidTextNode(n);
      });
    }

    let collapseToStart = false;
    const indexOfSelf = siblingTextNodesAndSelf.indexOf(ele);
    let nearestNode = siblingTextNodesAndSelf[indexOfSelf - 1];
    if (!nearestNode) {
      nearestNode = siblingTextNodesAndSelf[indexOfSelf + 1];
      collapseToStart = true;
    }
    if (!nearestNode && ele.nodeType === Node.ELEMENT_NODE) {
      const prevLeaves = this.getLeafNodeElements((<Element>ele).previousElementSibling);
      nearestNode = prevLeaves[prevLeaves.length - 1];
      if (!nearestNode) {
        collapseToStart = true;
        nearestNode = this.getLeafNodeElements((<Element>ele).nextElementSibling)[0];
      }
    }

    let chosenNode: Node | null = null;

    // Prioritize text node use
    if (this.isValidTextNode(nearestNode) || this.isElementNode(nearestNode)) {
      chosenNode = nearestNode;
    } else if (this.isElementNode(ele)) {
      const element = <Element>ele;
      if (element.previousElementSibling) {
        chosenNode = element.previousElementSibling;
      } else if (element.nextElementSibling) {
        chosenNode = element.nextElementSibling;
      }
    }

    if (chosenNode) {
      chosenNode = ele.parentNode;
    }

    return [chosenNode, collapseToStart];
  }

  public getLeafNodeElements(root: Node | null): Node[] {
    const leafNodeElements: Node[] = [];
    if (!root) {
      return leafNodeElements;
    }

    const nodeIterator = document.createNodeIterator(
      root,
      // tslint:disable-next-line:no-bitwise
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      { acceptNode: (): number => { return NodeFilter.FILTER_ACCEPT; } },
    );

    let node = nodeIterator.nextNode();
    let prevNode = null;
    while (node) {
      const isLeafNode = node.nodeType === Node.ELEMENT_NODE &&
                                           (<Element>(node)).childElementCount === 0 &&
                                           !this.isValidTextNodeContent(node.textContent);
      if (isLeafNode || this.isValidTextNode(node)) {
        const element = (node.nodeType === Node.TEXT_NODE) ? node.parentNode : node;
        if (!this.elementChecker ||
            !this.elementChecker.isElementBlacklisted(element)) {
          leafNodeElements.push(node);
        }
        node = nodeIterator.nextNode();
      } else {
        // If the previous node is the same as the last node, assume we've entered an infinite loop
        // and break out of it.
        if (prevNode === node) {
          break;
        }
        prevNode = node;
      }
    }

    return leafNodeElements;
  }

  private checkVisibility(ele: Node, calcPercent: boolean): number | null {
    const eleRects = this.getNodeRectangles(ele);
    if (eleRects.length === 0) {
      return null;
    }

    return this.calcVisibility(eleRects, calcPercent);
  }

  private getNodeRectangles(node: Node): Rect[] {
    let clientRects: DOMRectList;
    if (node.nodeType === Node.TEXT_NODE) {
      const range = this.createRange();
      range.selectNode(node);
      clientRects = <DOMRectList>(range.getClientRects());
    } else {
      const ele = <Element>(node);
      clientRects = <DOMRectList>(ele.getClientRects());
    }

    return this.normalizeDomRectangles(clientRects);
  }

  private getRangeRectangles(range: Range): Rect[] {
    return this.normalizeDomRectangles(<DOMRectList>range.getClientRects());
  }

  private normalizeDomRectangles(rectList: DOMRectList): Rect[] {
    const rects: Rect[] = [];
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < rectList.length; i += 1) {
      const r = Rect.fromDOMRect(rectList[i]);
      // Handle rects returned by Webkit
      if (this.viewport && this.columnSize[0] > 0 &&
          (r.top < this.viewport.top || r.bottom > this.viewport.bottom)) {
        const columnWidth = this.columnSize[0];
        const columnHeight = this.columnSize[1];

        while (r.top < 0) {
          r.top += columnHeight;
          r.bottom += columnHeight;
          r.left -= columnWidth;
          r.right -= columnWidth;
        }

        const pageLeft = Math.floor(r.left / columnWidth) * columnWidth;
        const pageRight = Math.ceil(r.right / columnWidth) * columnWidth;
        const pageRect = new Rect(pageLeft, 0, pageRight, columnHeight);
        while (pageRect.top < r.bottom) {
          if (pageRect.overlapVertical(r)) {
            const newTop = Math.max(r.top, pageRect.top) - pageRect.top + this.viewport.top;
            // tslint:disable-next-line:max-line-length
            const newBottom = Math.min(r.bottom, pageRect.bottom) - pageRect.top + this.viewport.top;
            rects.push(new Rect(pageRect.left, newTop, pageRect.right, newBottom));
          }

          pageRect.left = pageRect.right;
          pageRect.right += columnWidth;
          pageRect.top = pageRect.bottom;
          pageRect.bottom += columnHeight;
        }
      } else {
        rects.push(r);
      }
    }

    return rects;
  }

  private calcVisibility(rects: Rect[], calcPercent: boolean): number {
    if (!this.viewport) {
      return 0;
    }

    let visPercent = 0;
    for (const r of rects) {
      if (r.intersect(this.viewport)) {
        if (!calcPercent) {
          visPercent = 100;
          break;
        }
        visPercent += (r.horizontalOverlap(this.viewport) / r.height()) * 100;
      }
    }

    return Math.ceil(visPercent);
  }

  private createRange(): Range {
    return this.rootDoc.createRange();
  }

  private createRangeFromNode(textnode: Node): Range {
    const documentRange = this.createRange();
    documentRange.selectNodeContents(textnode);

    return documentRange;
  }

  private splitRange(range: Range): Range[] {
    if (range.endOffset - range.startOffset === 1) {
      return [range];
    }

    const leftRangeLength = Math.round((range.endOffset - range.startOffset) / 2);
    const textNode = range.startContainer;
    const leftNodeRange = range.cloneRange();
    leftNodeRange.setStart(textNode, range.startOffset);
    leftNodeRange.setEnd(textNode, range.startOffset + leftRangeLength);

    const rightNodeRange = range.cloneRange();
    rightNodeRange.setStart(textNode, range.startOffset + leftRangeLength);
    rightNodeRange.setEnd(textNode, range.endOffset);

    return [leftNodeRange, rightNodeRange];
  }

  private isValidTextNode(node: Node): boolean {
    if (node && node.nodeType === Node.TEXT_NODE) {
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

  private isElementNode(node: Node | null): boolean {
    if (!node) {
      return false;
    }

    return node.nodeType === Node.ELEMENT_NODE;
  }
}
