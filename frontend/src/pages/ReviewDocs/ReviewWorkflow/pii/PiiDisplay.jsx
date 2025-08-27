import React, {useState, useEffect} from 'react';
import { useOutletContext } from 'react-router-dom';
import { Grid, Row, Col, Table, Tag, Stack, Panel } from 'rsuite';
import { FaLock, FaShieldAlt } from 'react-icons/fa';
import compmeddata from 'src/assets/compmed-pii.json';
import groupBy from 'lodash/groupBy';
import { Storage } from 'aws-amplify';

const { Column, HeaderCell, Cell } = Table;
const CompactCell = props => {
    // Get the userRole from props passed down from parent
    const { userRole } = props;
    const isAdmin = userRole === 'admin';
    
    if(props.dataKey === 'entity'){
        // If not admin, mask the entity text
        const displayText = isAdmin 
            ? props.rowData.entity
            : `[REDACTED ${props.rowData.entity_type}]`;
            
        return <Cell {...props} style={{ padding: 4 }}>
                <b>{displayText}</b>
                {!isAdmin && (
                  <small style={{ fontSize: '11px', color: '#757575', marginLeft: '5px', display: 'block' }}>
                    (Content masked for data protection)
                  </small>
                )}
            </Cell>;
    }
    if(props.dataKey === 'entity_type'){
        return <Cell {...props} style={{ padding: 4 }}>
                    <code>{props.rowData.entity_type}</code>
            </Cell>;
    }
    if(props.dataKey === 'score'){
        return <Cell {...props} style={{ padding: 4 }}>                
                    <code>{props.rowData.score}</code>
            </Cell>;
    }
    if(props.dataKey === 'category'){
        return <Cell {...props} style={{ fontSize: '12px', padding: 4 }}>
                <code>
                    {props.rowData.category}                    
                </code>
            </Cell>;
    }
    if(props.dataKey === "traits"){
        return <Cell {...props} style={{ fontSize: '12px', padding: 4 }}>
                    <Stack direction='column' alignItems="flex-start" spacing={4}>
                    {
                        props.rowData.traits.map((elem, idx) => {
                            return <Tag key={idx} size='sm' style={{border: 'solid 0.5px grey', fontSize: '11px', padding: '2px !important'}}>
                                        <b>Trait:</b> <code>{elem.name}</code>, <b>Confidence: </b><code>{elem.score}</code>
                                    </Tag>
                        })
                    }
                    </Stack>
                </Cell>
    }
    return <Cell {...props} style={{ fontSize: '12px', padding: 4 }} />;
} 
const CompactHeaderCell = props => <HeaderCell 
                                      {...props} 
                                      style={{ 
                                        //   padding: 4, 
                                          color: '#757575', 
                                          background: "#FAFAFA", 
                                          fontSize: '13px', 
                                          fontWeight: 'bold'
                                        }} 
                                      />;

const defaultColumns = [
    {
      key: 'entity',
      label: 'Entity',
      flexGrow: 2,
      verticalAlign: 'middle'
    },
    {
      key: 'entity_type',
      label: 'Entity Type',
      flexGrow: 2,
      verticalAlign: 'middle'    
    },
    {
      key: 'category',
      label: 'Category',
      width: 0,
      verticalAlign: 'middle'
    },
    {
      key: 'score',
      label: 'Confidence',      
      flexGrow: 1,
      verticalAlign: 'middle',
      visible: false
    },
    {
      key: 'traits',
      label: 'Traits',  
      flexGrow: 2,
      verticalAlign: 'middle'
    }
  ];

const PiiDisplay = () => {
    // Get user role from context
    const { userRole } = useOutletContext() || { userRole: 'customer' };
    const isAdmin = userRole === 'admin';
    
    const [columnKeys] = useState(defaultColumns.map(column => column.key));
    const columns = defaultColumns.filter(column => columnKeys.some(key => key === column.key));
    const [data, setdata] = useState(undefined);
    const [documentUrl, setDocumentUrl] = useState('');
    
    // Attempt to get a sample document for display
    useEffect(() => {
        async function fetchSampleDocument() {
            try {
                // Check if there's a sample PDF in the public folder
                const sampleUrl = '/sample-document.pdf';
                setDocumentUrl(sampleUrl);
            } catch (error) {
                console.error('Error fetching sample document:', error);
            }
        }
        
        fetchSampleDocument();
    }, []);
    
    useEffect(() => {
      const entities = compmeddata["Entities"];
      const dataset = [];
      for(const entity of entities){
        let ent = {};
        ent["entity"] = entity["Text"];
        ent["entity_type"] = entity["Type"];
        ent["score"] = parseInt(entity["Score"].toPrecision(2) * 100,10)+"%";
        ent["category"] = entity["Category"];
        let traits = entity["Traits"], trait_list = [];
        if(traits.length > 0){
            for(const tr of traits){
                const trt = {}
                trt["name"] = tr["Name"];
                trt["score"] = parseInt(tr["Score"].toPrecision(2) * 100,10)+"%"
                trait_list.push(trt);
            }            
        }
        ent["traits"] = trait_list;
        dataset.push(ent)
      }
      const grouped = groupBy(dataset, elem => elem.category);
      console.log(grouped);
      setdata(grouped);
    }, [])
    
    return (
        <div>        
            <Grid fluid>
                {/* Access Level Indicator */}
                <Row style={{ marginBottom: '15px' }}>
                    <Col xs={24}>
                        {!isAdmin ? (
                            <Panel 
                                bordered 
                                style={{ 
                                    backgroundColor: '#fff3e0', 
                                    border: '1px solid #ffcc80',
                                    marginBottom: '10px'
                                }}
                                header={
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <FaShieldAlt style={{ marginRight: '8px', color: '#ff9800' }} /> 
                                        <span style={{ fontWeight: 'bold', color: '#e65100' }}>Restricted View</span>
                                    </div>
                                }
                            >
                                <p>You have limited access to PII data. PII entities are masked for data protection purposes. Please contact an administrator if you need full access.</p>
                            </Panel>
                        ) : (
                            <Panel 
                                bordered 
                                style={{ 
                                    backgroundColor: '#e8f5e9', 
                                    border: '1px solid #a5d6a7',
                                    marginBottom: '10px'
                                }}
                                header={
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <FaLock style={{ marginRight: '8px', color: '#4caf50' }} /> 
                                        <span style={{ fontWeight: 'bold', color: '#2e7d32' }}>Admin Access</span>
                                    </div>
                                }
                            >
                                <p>You have full access to view all PII entity information.</p>
                            </Panel>
                        )}
                    </Col>
                </Row>
            
                <Row gutter={22}>
                    <Col xxl={12} xl={12} lg={24} xs={24} sm={24} md={8} >
                        <div style={{height: '100vh', border: 'solid 1px black'}}>
                            {documentUrl ? (
                                <embed src={`${documentUrl}#view=fitH`} style={{height: '100%', width: '100%'}}/>
                            ) : (
                                <div style={{
                                    height: '100%',
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#f5f5f5'
                                }}>
                                    <p>No document selected. Please select a document to view.</p>
                                </div>
                            )}
                        </div>
                    </Col>
                    <Col xxl={12} xl={12} lg={24} xs={24} sm={24} md={8} style={{height: '100vh',overflowY: 'scroll'}}>
                        {
                            (data)&&
                            Object.keys(data).map((category, i) => {
                                return <div key={`${category}-${i}`} direction='column' alignItems="flex-start" spacing={8}>
                                            <div style={{margin: '16px 0px 8px 0px'}}>
                                                Entity Category: <Tag color="cyan" size="lg">{category}</Tag>
                                            </div>
                                            <Table                                               
                                                hover={true}
                                                showHeader={true}              
                                                autoHeight
                                                affixHeader
                                                data={data[category]}
                                                cellBordered={false}
                                                headerHeight={40}
                                                rowHeight={60}                
                                            >
                                            {columns.map(column => {
                                                const { key, label, ...rest } = column;
                                                return (
                                                <Column {...rest} key={`${key}-${category}`}>
                                                    <CompactHeaderCell>{label}</CompactHeaderCell>
                                                    <CompactCell dataKey={key} userRole={userRole} />
                                                </Column>
                                                );
                                            })}
                                            </Table>
                                        </div>
                            })
                        }
                    </Col>        
                </Row>
            </Grid>
        </div> 
    )
}

export default PiiDisplay;
