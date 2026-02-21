

import React from 'react';
import CardPro from '../../common/ui/CardPro';
import ModelsTable from './ModelsTable';
import ModelsActions from './ModelsActions';
import ModelsFilters from './ModelsFilters';
import ModelsTabs from './ModelsTabs';
import EditModelModal from './modals/EditModelModal';
import EditVendorModal from './modals/EditVendorModal';
import { useModelsData } from '../../../hooks/models/useModelsData';
import { useIsMobile } from '../../../hooks/common/useIsMobile';
import { createCardProPagination } from '../../../helpers/utils';

const ModelsPage = () => {
  const modelsData = useModelsData();
  const isMobile = useIsMobile();

  const {
    // Edit state
    showEdit,
    editingModel,
    closeEdit,
    refresh,

    // Actions state
    selectedKeys,
    setSelectedKeys,
    setEditingModel,
    setShowEdit,
    batchDeleteModels,

    // Filters state
    formInitValues,
    setFormApi,
    searchModels,
    loading,
    searching,

    // Description state
    compactMode,
    setCompactMode,

    // Vendor state
    showAddVendor,
    setShowAddVendor,
    showEditVendor,
    setShowEditVendor,
    editingVendor,
    setEditingVendor,
    loadVendors,

    // Translation
    t,
  } = modelsData;

  return (
    <>
      <EditModelModal
        refresh={refresh}
        editingModel={editingModel}
        visiable={showEdit}
        handleClose={closeEdit}
      />

      <EditVendorModal
        visible={showAddVendor || showEditVendor}
        handleClose={() => {
          setShowAddVendor(false);
          setShowEditVendor(false);
          setEditingVendor({ id: undefined });
        }}
        editingVendor={showEditVendor ? editingVendor : { id: undefined }}
        refresh={() => {
          loadVendors();
          refresh();
        }}
      />

      <CardPro
        type='type3'
        // tabsArea={<ModelsTabs {...modelsData} />}
        actionsArea={
          <div className='flex flex-col md:flex-row justify-between items-center gap-2 w-full'>
            <ModelsActions
              selectedKeys={selectedKeys}
              setSelectedKeys={setSelectedKeys}
              setEditingModel={setEditingModel}
              setShowEdit={setShowEdit}
              batchDeleteModels={batchDeleteModels}
              syncing={modelsData.syncing}
              syncUpstream={modelsData.syncUpstream}
              previewing={modelsData.previewing}
              previewUpstreamDiff={modelsData.previewUpstreamDiff}
              applyUpstreamOverwrite={modelsData.applyUpstreamOverwrite}
              compactMode={compactMode}
              setCompactMode={setCompactMode}
              t={t}
            />

            <div className='w-full md:w-full lg:w-auto order-1 md:order-2'>
              <ModelsFilters
                formInitValues={formInitValues}
                setFormApi={setFormApi}
                searchModels={searchModels}
                loading={loading}
                searching={searching}
                t={t}
              />
            </div>
          </div>
        }
        paginationArea={createCardProPagination({
          currentPage: modelsData.activePage,
          pageSize: modelsData.pageSize,
          total: modelsData.modelCount,
          onPageChange: modelsData.handlePageChange,
          onPageSizeChange: modelsData.handlePageSizeChange,
          isMobile: isMobile,
          t: modelsData.t,
        })}
        t={modelsData.t}
      >
        <ModelsTable {...modelsData} />
      </CardPro>
    </>
  );
};

export default ModelsPage;
