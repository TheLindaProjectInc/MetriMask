const hasClass = (element: HTMLElement, cls: string) => {
  return !!element.className.match(new RegExp( '(\\s|^)' + cls + '(\\s|$)'));
};

const addClass = (element: HTMLElement, cls: string) => {
  if (!hasClass(element, cls)) {
    element.className += ' ' + cls;
  }
};

const removeClass = (element: HTMLElement, cls: string) => {
  if (hasClass(element, cls)) {
    element.className = element.className.replace(new RegExp('(\\s|^)' + cls + '(\\s|$)' ), ' ');
  }
};

const getHeight = (element: HTMLElement) => {
  let height = element.offsetHeight;
  const which = ['Top', 'Bottom'];

  if (height === 0) {
    return 0;
  }

  const styles = window.getComputedStyle(element, null);

  which.forEach((name) => {
    height -= parseFloat(styles['border' + name + 'Width'] as string) || 0;
    height -= parseFloat(styles['padding' + name] as string) || 0;
  });

  return height;
};

export const showModal = (width: number, height: number, style: any = {}, src?: string): Promise<HTMLIFrameElement> => {
  const iframe = document.createElement('iframe');

  addClass(iframe, 'metrimask-extension-modal');

  const backdrop = document.createElement('div');
  addClass(backdrop, 'metrimask-extension-modal-backdrop');

  const html = document.documentElement;
  addClass(html, 'metrimask-extension-modal-wrap');

  const body = document.querySelector('body')!;

  const bodyHeight = getHeight(body);

  backdrop.style.height = bodyHeight.toString() + 'px';

  Object.assign(iframe.style, {
    ...style,
    border: 'none',
    width: width.toString() + 'px',
    height: height.toString() + 'px',
    top: 'calc(50vh + ' + (window.pageYOffset - height / 2).toString() + 'px)',
    left: 'calc(50vw + ' + (window.pageXOffset - width / 2).toString() + 'px)',
  });

  body.appendChild(backdrop);
  body.appendChild(iframe);

  if (src) {
    iframe.src = src;

    return new Promise((resolve, reject) => {
      iframe.addEventListener('load', () => resolve(iframe));
      iframe.addEventListener('error', (e) => reject(e));
    });
  }

  return new Promise((resolve) => resolve(iframe));
};

export const closeModal = () => {
  const iframe = document.querySelector('iframe.metrimask-extension-modal');

  if (iframe) {
    iframe.remove();
    const backdrop = document.querySelector('.metrimask-extension-modal-backdrop');

    if (backdrop) { backdrop.remove(); }

    removeClass(document.documentElement, 'metrimask-extension-modal-wrap');
  }
};
