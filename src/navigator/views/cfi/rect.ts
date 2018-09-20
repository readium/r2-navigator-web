export class Rect {
  public left: number;
  public top: number;
  public right: number;
  public bottom: number;

  public constructor(left: number, top: number, right: number, bottom: number) {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
  }

  public static fromDOMRect(r: DOMRect): Rect {
    return new Rect(r.left, r.top, r.right, r.bottom);
  }

  public width(): number {
    return this.right - this.left;
  }

  public height(): number {
    return this.bottom - this.top;
  }

  public intersect(r: Rect): boolean {
    return this.overlapHorizontal(r) && this.overlapVertical(r);
  }

  public overlapHorizontal(rect: Rect): boolean {
    if (this.right <= rect.left || this.left >= rect.right) {
      return false;
    }

    return true;
  }

  public overlapVertical(rect: Rect): boolean {
    if (this.bottom <= rect.top || this.top >= rect.bottom) {
      return false;
    }

    return true;
  }

  public horizontalOverlap(rect: Rect): number {
    const maxLeft = Math.max(this.left, rect.left);
    const minRight = Math.min(this.right, rect.right);
    const length = minRight - maxLeft;

    return length < 0 ? 0 : length;
  }

  public verticalOverlaop(rect: Rect): number {
    const maxTop = Math.max(this.top, rect.top);
    const minBottom = Math.min(this.bottom, rect.bottom);
    const length = minBottom - maxTop;

    return length < 0 ? 0 : length;
  }
}
