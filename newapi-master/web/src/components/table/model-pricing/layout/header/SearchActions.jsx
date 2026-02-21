

import React, { memo, useCallback } from 'react';
import { Input, Divider } from '@douyinfe/semi-ui';
import { IconSearch } from '@douyinfe/semi-icons';

const SearchActions = memo(
  ({
    handleChange,
    handleCompositionStart,
    handleCompositionEnd,
    searchValue = '',
    t,
  }) => {

    return (
      <div className='flex items-center gap-2 w-full'>
        <div className='flex-1'>
          <Input
            prefix={<IconSearch />}
            placeholder={t('模糊搜索模型名称')}
            value={searchValue}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onChange={handleChange}
            showClear
          />
        </div>
      </div>
    );
  },
);

SearchActions.displayName = 'SearchActions';

export default SearchActions;
