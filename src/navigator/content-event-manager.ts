import { IContentLoader } from './content-loader';
import { EventHandling } from '@readium/glue-modules';

interface ContentEventListener {
  callback: EventListener;
  opts: any;
  listenerID: number;
  removed: boolean;
}

export class ContentEventManager {
  private contentLoader: IContentLoader;

  private eventListeners: Map<string, ContentEventListener[]> = new Map();

  private eventSources: [HTMLIFrameElement, EventHandling][] = [];

  public constructor(loader: IContentLoader) {
    this.contentLoader = loader;

    this.contentLoader.addContentLoadedListener((iframe: HTMLIFrameElement) => {
      const eventSource = new EventHandling('event-handling', iframe.contentWindow!);
      this.eventSources.push([iframe, eventSource]);
      this.updateContentEventsInternal(eventSource);
    });

    this.contentLoader.addContentUnloadedListener((iframe: HTMLIFrameElement) => {
      this.eventSources = this.eventSources.filter((value) => {
        return value[0] !== iframe;
      });
    });
  }

  public addContentEventListener(
    spaceSeparatedEventNames: string,
    callback: EventListener,
    opts?: any,
  ): void {
    const eventNames = spaceSeparatedEventNames.split(' ');
    for (let i = 0; i < eventNames.length; i += 1) {
      const eventName = eventNames[i];
      let listeners = this.eventListeners.get(eventName);
      if (!listeners) {
        listeners = [];
        this.eventListeners.set(eventName, listeners);
      }
      listeners.push({ callback, opts, listenerID: -1, removed: false });
    }
  }

  public removeContentEventListener(
    spaceSeparatedEventNames: string,
    callback: EventListener,
  ): void {
    const eventNames = spaceSeparatedEventNames.split(' ');
    for (let i = 0; i < eventNames.length; i += 1) {
      const eventName = eventNames[i];
      const listeners = this.eventListeners.get(eventName);
      if (!listeners) {
        continue;
      }

      listeners.forEach((value) => {
        if (value.callback === callback) {
          value.removed = true;
        }
      });
    }
  }

  public async updateContentEvents(): Promise<void> {
    const promises = this.eventSources.map((value) => {
      return this.updateContentEventsInternal(value[1]);
    });

    await Promise.all(promises);
  }

  private async updateContentEventsInternal(eventSource: EventHandling): Promise<void> {
    for (const kvp of this.eventListeners) {
      const eventName = kvp[0];
      const eventHandlers = kvp[1];
      for (let i = 0, count = eventHandlers.length; i < count; i += 1) {
        const listener = eventHandlers[i];
        eventSource.removeEventListener(listener.listenerID);
        if (!listener.removed) {
          listener.listenerID =
          await eventSource.addEventListener(eventName, listener.callback, listener.opts);
        }
      }

      const filteredHandlers = eventHandlers.filter((value) => {
        return !value.removed;
      });
      if (filteredHandlers.length !== eventHandlers.length) {
        kvp[1] = filteredHandlers;
      }
    }
  }
}
