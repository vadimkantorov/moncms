/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$wrapNodeInElement, mergeRegister} from '@lexical/utils';
import {
  $createParagraphNode,
  $createRangeSelection,
  $getSelection,
  $insertNodes,
  $isNodeSelection,
  $isRootOrShadowRoot,
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  createCommand,
  DRAGOVER_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
  getDOMSelectionFromTarget,
  isHTMLElement,
  LexicalCommand,
  LexicalEditor,
} from 'lexical';
import {useEffect, useRef, useState, createContext, useContext} from 'react';

//import landscapeImage from '../../images/landscape.jpg';
//import yellowFlowerImage from '../../images/yellow-flower.jpg';
import {
  $createImageNode,
  $isImageNode,
  ImageNode,
  ImagePayload,
} from '../nodes/ImageNode';
import Button from '../ui/Button';
import {DialogActions, DialogButtonsList} from '../ui/Dialog';

import '../ui/Input.css';

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import '../ui/Button.css';

import {ReactNode} from 'react';

function joinClasses(
    ...args: Array<string | boolean | null | undefined>
  ) {
    //import joinClasses from '../utils/joinClasses';
    return args.filter(Boolean).join(' ');
  }
  

function Button({
  'data-test-id': dataTestId,
  children,
  className,
  onClick,
  disabled,
  small,
  title,
}: {
  'data-test-id'?: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
  small?: boolean;
  title?: string;
}): JSX.Element {
  return (
    <button
      disabled={disabled}
      className={joinClasses(
        'Button__root',
        disabled && 'Button__disabled',
        small && 'Button__small',
        className,
      )}
      onClick={onClick}
      title={title}
      aria-label={title}
      {...(dataTestId && {'data-test-id': dataTestId})}>
      {children}
    </button>
  );
}


export class ImageCache 
{
    private images: { [key: string]: string } = {};
    private prefix: string = '';

    reset(): void {
        this.images = {};
    }

    put(key: string, src: string): void 
    {
        this.images[key] = src;
    }

    resolve(key: string): string
    {
        if(key.startsWith('http'))
            return key;

        if(key in this.images)
            return this.images[key];

        return this.prefix + ((this.prefix != '' && !this.prefix.endsWith('/') ? '/' : '') + (key.startsWith('/') ? key.substring(1) : key));
    }
}

export const ImageCacheContext = createContext(null);

export type InsertImagePayload = Readonly<ImagePayload>;

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> =
  createCommand('INSERT_IMAGE_COMMAND');

export function InsertImageDialog({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor;
  onClose: () => void;
}): JSX.Element {
  const [src, setSrc] = useState('');
  const [altText, setAltText] = useState('');
  const [datauri, setDatauri] = useState('');
  const [mode, setMode] = useState<null | 'url' | 'file'>(null);
  const hasModifier = useRef(false);
  
  const isDisabled = src === '';

  useEffect(() => {
    hasModifier.current = false;
    const handler = (e: KeyboardEvent) => {
      hasModifier.current = e.altKey;
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [activeEditor]);

  const onClick = (payload: InsertImagePayload) => {
    activeEditor.dispatchCommand(INSERT_IMAGE_COMMAND, payload);
    onClose();
  };

  const loadImage = (files: FileList | null) => {
    if (files !== null && files.length > 0)
    {
        const file = files[0];
        const bloburl = URL.createObjectURL(file) + '#' + file.name;

        const reader = new FileReader();
        reader.onload = () =>
        {
            const datauri = reader.result;
            if (typeof(datauri) === 'string')
            {
                setSrc(bloburl);
                setDatauri(datauri);
            }
        };
        reader.readAsDataURL(file);
    }
    else
    {
        setSrc('');
        setDatauri('');
    }
  };

  return (
    <>
    
    <div className="Input__wrapper">
      <label className="Input__label">Image Upload</label>
      <input
        type="file"
        accept="image/*"
        className="Input__input"
        onChange={(e) => loadImage(e.target.files)}
        data-test-id="image-modal-file-upload"
      />
    </div>
    <div className="Input__wrapper">
      <label className="Input__label">Image URL</label>
      <input
        type="text"
        className="Input__input"
        placeholder="https://gstatic.com/images/branding/googlelogo/svg/googlelogo_clr_74x24px.svg"
        value={src}
        onChange={(e) => {
            setSrc(e.target.value);
        }}
        data-test-id="image-modal-url-input"
      />
    </div>

    <div className="Input__wrapper">
      <label className="Input__label">Alt Text</label>
      <input
        type="text"
        className="Input__input"
        placeholder="Descriptive alternative text"
        value={altText}
        onChange={(e) => {
            setAltText(e.target.value);
        }}
        data-test-id="image-modal-alt-text-input"
      />
    </div>
    <DialogButtonsList>
        <Button
          data-test-id="image-modal-file-upload-btn"
          disabled={isDisabled}
          onClick={() => onClick({altText, src, datauri})}>
          Confirm
        </Button>
    </DialogButtonsList>
    </>
  );
}

export default function ImagesPlugin({
  captionsEnabled,
}: {
  captionsEnabled?: boolean;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const imageCache = useContext(ImageCacheContext);

  useEffect(() => {
    if (!editor.hasNodes([ImageNode])) {
      throw new Error('ImagesPlugin: ImageNode not registered on editor');
    }

    return mergeRegister(
      editor.registerCommand<InsertImagePayload>(
        INSERT_IMAGE_COMMAND,
        (payload) => {
          imageCache.put(payload.src, payload.datauri);
          const imageNode = $createImageNode(payload);
          $insertNodes([imageNode]);
          if ($isRootOrShadowRoot(imageNode.getParentOrThrow())) {
            $wrapNodeInElement(imageNode, $createParagraphNode).selectEnd();
          }

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand<DragEvent>(
        DRAGSTART_COMMAND,
        (event) => {
          return $onDragStart(event);
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand<DragEvent>(
        DRAGOVER_COMMAND,
        (event) => {
          return $onDragover(event);
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<DragEvent>(
        DROP_COMMAND,
        (event) => {
          return $onDrop(event, editor);
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [captionsEnabled, editor]);

  return null;
}

const TRANSPARENT_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const img = document.createElement('img');
img.src = TRANSPARENT_IMAGE;

function $onDragStart(event: DragEvent): boolean {
  const node = $getImageNodeInSelection();
  if (!node) {
    return false;
  }
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) {
    return false;
  }
  dataTransfer.setData('text/plain', '_');
  dataTransfer.setDragImage(img, 0, 0);
  dataTransfer.setData(
    'application/x-lexical-drag',
    JSON.stringify({
      data: {
        altText: node.__altText,
        caption: node.__caption,
        height: node.__height,
        key: node.getKey(),
        maxWidth: node.__maxWidth,
        showCaption: node.__showCaption,
        src: node.__src,
        width: node.__width,
      },
      type: 'image',
    }),
  );

  return true;
}

function $onDragover(event: DragEvent): boolean {
  const node = $getImageNodeInSelection();
  if (!node) {
    return false;
  }
  if (!canDropImage(event)) {
    event.preventDefault();
  }
  return true;
}

function $onDrop(event: DragEvent, editor: LexicalEditor): boolean {
  const node = $getImageNodeInSelection();
  if (!node) {
    return false;
  }
  const data = getDragImageData(event);
  if (!data) {
    return false;
  }
  event.preventDefault();
  if (canDropImage(event)) {
    const range = getDragSelection(event);
    node.remove();
    const rangeSelection = $createRangeSelection();
    if (range !== null && range !== undefined) {
      rangeSelection.applyDOMRange(range);
    }
    $setSelection(rangeSelection);
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, data);
  }
  return true;
}

function $getImageNodeInSelection(): ImageNode | null {
  const selection = $getSelection();
  if (!$isNodeSelection(selection)) {
    return null;
  }
  const nodes = selection.getNodes();
  const node = nodes[0];
  return $isImageNode(node) ? node : null;
}

function getDragImageData(event: DragEvent): null | InsertImagePayload {
  const dragData = event.dataTransfer?.getData('application/x-lexical-drag');
  if (!dragData) {
    return null;
  }
  const {type, data} = JSON.parse(dragData);
  if (type !== 'image') {
    return null;
  }

  return data;
}

declare global {
  interface DragEvent {
    rangeOffset?: number;
    rangeParent?: Node;
  }
}

function canDropImage(event: DragEvent): boolean {
  const target = event.target;
  return !!(
    isHTMLElement(target) &&
    !target.closest('code, span.editor-image') &&
    isHTMLElement(target.parentElement) &&
    target.parentElement.closest('div.ContentEditable__root')
  );
}

function getDragSelection(event: DragEvent): Range | null | undefined {
  let range;
  const domSelection = getDOMSelectionFromTarget(event.target);
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(event.clientX, event.clientY);
  } else if (event.rangeParent && domSelection !== null) {
    domSelection.collapse(event.rangeParent, event.rangeOffset || 0);
    range = domSelection.getRangeAt(0);
  } else {
    throw Error(`Cannot get the selection when dragging`);
  }

  return range;
}
