type FillGreetingResult =
  | {
      ok: true;
    }
  | {
      error: string;
      ok: false;
    };

export function fillGreetingDraft(document: Document, greetingMessage: string): FillGreetingResult {
  const element = findGreetingInput(document);

  if (!element) {
    return {
      error: "没有找到可填写的聊天输入框，请手动复制后粘贴。",
      ok: false
    };
  }

  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    setNativeValue(element, greetingMessage);
    element.focus();
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return { ok: true };
  }

  element.textContent = greetingMessage;
  element.dispatchEvent(new InputEvent("input", { bubbles: true, data: greetingMessage }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  (element as HTMLElement).focus();

  return { ok: true };
}

function findGreetingInput(document: Document) {
  const selectors = [
    "[class*='chat'] textarea",
    "[class*='input'] textarea",
    "[class*='message'] textarea",
    "[class*='editor'] [contenteditable='true']",
    "[class*='dialog'] [contenteditable='true']",
    "[class*='chat'] [contenteditable='true']",
    "[class*='message'] [contenteditable='true']",
    "[role='textbox']",
    "textarea",
    "[contenteditable='true']",
    "input[type='text']"
  ];

  for (const selector of selectors) {
    const elements = Array.from(document.querySelectorAll(selector)).filter(isVisibleEditable);

    if (elements.length > 0) {
      return elements[0];
    }
  }

  return null;
}

function isVisibleEditable(element: Element) {
  if (
    !(element instanceof HTMLTextAreaElement) &&
    !(element instanceof HTMLInputElement) &&
    !(element instanceof HTMLElement)
  ) {
    return false;
  }

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    if (element.disabled || element.readOnly) {
      return false;
    }
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none"
  );
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }
}
