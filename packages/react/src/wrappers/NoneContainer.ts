import {
  createElement,
  forwardRef,
  memo, useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { clearDropTarget, ROOT, STATE_PROPS } from '@brickd/core';
import { useCommon } from '@brickd/hooks';
import { VirtualDOMType } from '@brickd/utils';
import { isEmpty } from 'lodash';
import {
  CommonPropsType,
  controlUpdate,
  handlePropsClassName,
  HookState,
  propAreEqual,
  stateSelector,
} from '../common/handleFuns';
import {
  generateRequiredProps,
  getComponent,
  getDragKey,
  getDragSourceVDom,
  getIframe,
  getIsModalChild,
  getSelectedNode,
} from '../utils';
import { useSelect } from '../hooks/useSelect';
import { useSelector } from '../hooks/useSelector';
import { useEvents } from '../hooks/useEvents';
import { useOperate } from '../hooks/useOperate';

function NoneContainer(allProps: CommonPropsType, ref: any) {
  const {
    specialProps,
    specialProps: { key, domTreeKeys },
    ...rest
  } = allProps;
  const { pageConfig: PageDom } = useSelector<HookState, STATE_PROPS>(
    stateSelector,
    (prevState, nextState) => controlUpdate(prevState, nextState, key),
  );
  const { isSelected, lockedKey } = useSelect(specialProps);
  const pageConfig = PageDom[ROOT] ? PageDom : getDragSourceVDom();
  const vNode = (pageConfig[key] || {}) as VirtualDOMType;
  const { componentName } = vNode;
  const { props, hidden, pageState } = useCommon(vNode, rest);
  const { index = 0, funParams, item } = pageState;
  const uniqueKey=`${key}-${index}`;
  const parentRootNode = useRef<HTMLElement>();
  const {
    setSelectedNode,
    ...events
  } = useEvents(parentRootNode, specialProps, isSelected,props);
  const isModal = useMemo(() => getIsModalChild(pageConfig, domTreeKeys), [
    pageConfig,
    domTreeKeys,
  ]);
  const { getOperateState,setOperateState } = useOperate(isModal);
  useEffect(() => {
    const iframe = getIframe();
    parentRootNode.current = getSelectedNode(uniqueKey, iframe);
    const { index: selectedIndex } = getOperateState();
    if (
      !getDragKey() &&
      isSelected &&
      (isEmpty(funParams || item) ||
        (isEmpty(funParams || item) && selectedIndex === index))
    ) {
      setSelectedNode(parentRootNode.current);
    }

    parentRootNode.current&&parentRootNode.current.addEventListener('dragenter',onDragEnter);
    return ()=>{
      parentRootNode.current&&parentRootNode.current.removeEventListener('dragenter',onDragEnter);
    };
  });



  const onDragEnter=useCallback((e)=>{
    e.stopPropagation();
    setOperateState({
      dropNode: parentRootNode.current,
      isDropAble:false,
    });
    clearDropTarget();
  },[parentRootNode.current]);

  if (!isSelected && (!componentName || hidden)) return null;
  const { className, animateClass, ...restProps } = props || {};
  const dragKey = getDragKey();
  return createElement(getComponent(componentName), {
    ...restProps,
    className: handlePropsClassName(
      uniqueKey,
      dragKey === key ||
        (dragKey && !isSelected && domTreeKeys.includes(lockedKey)),
      className,
      animateClass),
    onDragEnter,
    ...events,
    ...generateRequiredProps(componentName),
    draggable: true,
    /**
     * 设置组件id方便抓取图片
     */
    ref,
  });
}

export default memo<CommonPropsType>(forwardRef(NoneContainer), propAreEqual);
