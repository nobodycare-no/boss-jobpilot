import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { fillGreetingDraft } from "./fill-greeting";

class FakeEvent {
  type: string;

  constructor(type: string) {
    this.type = type;
  }
}

class FakeInputEvent extends FakeEvent {
  data?: string;

  constructor(type: string, init?: { data?: string }) {
    super(type);
    this.data = init?.data;
  }
}

class FakeHTMLElement {
  disabled = false;
  focused = false;
  readOnly = false;
  textContent = "";
  private height: number;
  private width: number;
  readonly events: string[] = [];

  constructor({ height = 20, width = 120 } = {}) {
    this.height = height;
    this.width = width;
  }

  dispatchEvent(event: FakeEvent) {
    this.events.push(event.type);
    return true;
  }

  focus() {
    this.focused = true;
  }

  getBoundingClientRect() {
    return {
      height: this.height,
      width: this.width
    };
  }
}

class FakeHTMLInputElement extends FakeHTMLElement {
  private currentValue = "";

  get value() {
    return this.currentValue;
  }

  set value(value: string) {
    this.currentValue = value;
  }
}

class FakeHTMLTextAreaElement extends FakeHTMLInputElement {
  override get value() {
    return super.value;
  }

  override set value(value: string) {
    super.value = value;
  }
}

function createDocument(elementsBySelector: Record<string, FakeHTMLElement[]>): Document {
  return {
    querySelectorAll(selector: string) {
      return elementsBySelector[selector] ?? [];
    }
  } as unknown as Document;
}

describe("fillGreetingDraft", () => {
  const originalEvent = globalThis.Event;
  const originalInputEvent = globalThis.InputEvent;
  const originalHTMLElement = globalThis.HTMLElement;
  const originalHTMLInputElement = globalThis.HTMLInputElement;
  const originalHTMLTextAreaElement = globalThis.HTMLTextAreaElement;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    globalThis.Event = FakeEvent as unknown as typeof Event;
    globalThis.InputEvent = FakeInputEvent as unknown as typeof InputEvent;
    globalThis.HTMLElement = FakeHTMLElement as unknown as typeof HTMLElement;
    globalThis.HTMLInputElement = FakeHTMLInputElement as unknown as typeof HTMLInputElement;
    globalThis.HTMLTextAreaElement =
      FakeHTMLTextAreaElement as unknown as typeof HTMLTextAreaElement;
    globalThis.window = {
      getComputedStyle: () => ({
        display: "block",
        visibility: "visible"
      })
    } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    globalThis.Event = originalEvent;
    globalThis.InputEvent = originalInputEvent;
    globalThis.HTMLElement = originalHTMLElement;
    globalThis.HTMLInputElement = originalHTMLInputElement;
    globalThis.HTMLTextAreaElement = originalHTMLTextAreaElement;
    globalThis.window = originalWindow;
  });

  it("fills the first visible textarea and dispatches editable events", () => {
    const textarea = new FakeHTMLTextAreaElement();
    const document = createDocument({
      textarea: [textarea]
    });

    expect(fillGreetingDraft(document, "您好，想沟通这个岗位")).toEqual({ ok: true });
    expect(textarea.value).toBe("您好，想沟通这个岗位");
    expect(textarea.focused).toBe(true);
    expect(textarea.events).toEqual(["input", "change"]);
  });

  it("fills a visible contenteditable textbox without sending anything", () => {
    const editor = new FakeHTMLElement();
    const document = createDocument({
      "[role='textbox']": [editor]
    });

    expect(fillGreetingDraft(document, "这是一条打招呼语")).toEqual({ ok: true });
    expect(editor.textContent).toBe("这是一条打招呼语");
    expect(editor.focused).toBe(true);
    expect(editor.events).toEqual(["input", "change"]);
  });

  it("skips readonly and hidden text inputs", () => {
    const readonlyInput = new FakeHTMLInputElement();
    readonlyInput.readOnly = true;
    const hiddenInput = new FakeHTMLInputElement({ height: 0, width: 0 });
    const visibleInput = new FakeHTMLInputElement();
    const document = createDocument({
      "input[type='text']": [readonlyInput, hiddenInput, visibleInput]
    });

    expect(fillGreetingDraft(document, "只应写入可见输入框")).toEqual({ ok: true });
    expect(readonlyInput.value).toBe("");
    expect(hiddenInput.value).toBe("");
    expect(visibleInput.value).toBe("只应写入可见输入框");
  });

  it("returns an actionable error when no editable field exists", () => {
    const document = createDocument({});

    expect(fillGreetingDraft(document, "无法写入")).toEqual({
      error: "没有找到可填写的聊天输入框，请手动复制后粘贴。",
      ok: false
    });
  });
});
