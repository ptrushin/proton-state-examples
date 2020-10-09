import React, { PureComponent } from "react";
import { withRouter } from "react-router-dom";
import OdataProvider from "ag-grid-odata";
import { AllModules } from "ag-grid-enterprise";
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';
import moment from "moment";
import {ProtonState, AgGridStateProvider, FilterPanel, AntTagFilterPanelStateProvider} from 'proton-state';
//import {localeText} from 'proton-state/dist/antd-tag-filter-panel/locale/ru'

export class AgGridExample extends PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            columnDefs: [
                { headerName: "OrderId", field: "Order.OrderID", filter: 'agNumberColumnFilter' },
                { headerName: "OrderDate", field: "Order.OrderDate", type: 'dateColumn' },
                { headerName: "Product", field: "Product.ProductName", filter: 'agTextColumnFilter' },
                { headerName: "Quantity", field: "Quantity", filter: 'agNumberColumnFilter' },
                { headerName: "UnitPrice", field: "UnitPrice", filter: 'agNumberColumnFilter' },
                { headerName: "Discount", field: "Discount", filter: 'agNumberColumnFilter' },
            ],
            defaultColDef: {
                sortable: true
            },
            columnTypes: {
                'dateColumn': {
                    filter: 'agDateColumnFilter',
                    valueFormatter: (params) => params.value == null ? null : moment(params.value).format('DD.MM.YYYY')
                }
            },
            filterDefs: [
                {
                    name: 'OrderDate', title: 'OrderDate', type: 'date',
                    fieldName: 'Order/OrderDate'
                },
                {
                    name: 'Category', title: 'Category', type: 'select',
                    fieldName: 'Product/CategoryID',
                    option: {
                        key: 'CategoryID',
                        label: 'CategoryName',
                    },
                    dataSource: {entityName: 'Categories'}
                    
                },
                {
                    name: 'Product', title: 'Product', type: 'select',
                    fieldName: 'Product/ProductID',
                    //debounce: false,
                    //debounceTimeout: 500,
                    option: {
                        key: 'ProductID',
                        label: 'ProductName',
                        //count: 20,
                        //labelFunc: ({value}) => ``
                    },
                    dataSource: {
                        //name: 'odata',
                        entityName: 'Products',
                        filter: ({filters}) => !filters.Category ? null : `CategoryID eq ${filters.Category}`
                        //searchFields: ['Name', "Code"]
                    }
                }
            ],
            dataSources: {
                'odata': {
                    type: 'odata',
                    root: 'https://services.odata.org/V4/Northwind/Northwind.svc/',
                    //fetch: ({url}) => 
                }
            },
            /*filterTypes: {

            }*/
        }

        this.protonState = new ProtonState(
            {
                history: props.history,
                onChange: this.onStateChange
            });
    }


    componentDidMount() {
        this.updateFilterValuesByLocationSearch();
    }

    componentDidUpdate() {
        this.updateFilterValuesByLocationSearch();
    }

    updateFilterValuesByLocationSearch = () => {
        if (this.protonState) this.protonState.updateStateFromUrl();
    }

    onFilterReady = (api) => {
        this.filterApi = api;
        this.protonState.addStateProvider(new AntTagFilterPanelStateProvider({api: api}))
    }

    onStateChange = (props) => {
        let {stateProvider} = props;
        if (!stateProvider || stateProvider.api !== this.gridApi) this.gridApi.purgeServerSideCache([]);
    }

    onGridReady = params => {
        this.gridApi = params.api;
        this.protonState.addStateProvider(new AgGridStateProvider({
            api: this.gridApi,
            columnDefs: {
                "Product.ProductName": {
                    stateName: 'ProductName'
                }
            }
        }))
        this.gridColumnApi = params.columnApi;
        params.api.setServerSideDatasource(
            new OdataProvider({
                callApi: (options) => fetch(`https://services.odata.org/V4/Northwind/Northwind.svc/Order_Details${options}`)
                    .then(response => {
                        if (!response.ok) {
                            return {
                                '@odata.count': 0,
                                value: []
                            };
                        }
                        return response.json()
                    })
                ,
                beforeRequest: (query) => {
                    query.expand = ["Order($expand=Customer)", "Product"];
                    let filters = this.filterApi.dataSourceTypes.odata.instance.getFilters({
                        filterDefs: this.filterApi.getFullFilterDefs(),
                        filters: this.filterApi.getFilters()
                    })
                    if (filters.length > 0) query.filter = filters;
                }
            })
        );
    };

    render() {
        return (
            <div style={{ width: '100%', height: '100vh' }}>
                <div style={{ height: '30px' }}>
                    <FilterPanel filterDefs={this.state.filterDefs}
                        dataSources={this.state.dataSources}
                        filterTypes={this.state.filterTypes}
                        //localeText={localeText}
                        onReady={({ api }) => this.onFilterReady(api)}
                    />
                </div>

                <div style={{ height: 'calc(100% - 30px)' }}>
                    <div
                        style={{
                            height: '100%',
                            width: '100%',
                        }}
                        className="ag-theme-balham"
                    >
                        <AgGridReact
                            defaultColDef={this.state.defaultColDef}
                            columnDefs={this.state.columnDefs}
                            rowData={this.state.rowData}
                            modules={AllModules}
                            rowModelType="serverSide"
                            cacheBlockSize={100}
                            onGridReady={this.onGridReady}
                            //localeText={agGridLocaleText}
                            columnTypes={this.state.columnTypes}
                            rowSelection="multiple"
                        >
                        </AgGridReact>
                    </div>
                </div>
            </div>
        );
    }
}

export default withRouter(AgGridExample);