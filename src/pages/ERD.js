import React, { useEffect, useState } from 'react';
import go from 'gojs';
import { json, useParams } from 'react-router-dom';


const ERD = () => {
  let {manifest} = useParams();
  manifest = (manifest.replace(/\s/g, ""));
  let nodeDataArray = []
  let linkDataArray = []
  const $ = go.GraphObject.make;
  let myDiagram;
  const [options,setOptions] = useState([])
  const [selected,setSelected] = useState([])

  //After accessing the first manifest, if submanifest remains !=[], this keeps running until completely destructured
  const fetchSubManifests = (subManifests) =>{
    // console.log(subManifests)
    const fetchPromises = subManifests.map((subManifest) =>
      fetch(`http://localhost:4000/schemaDocuments/${manifest}/${subManifest.definition}`)
        .then((response) => response.json(
        ))
    );

    Promise.all(fetchPromises)
      .then((subManifestData) => {
        console.log(subManifestData[0])
        if (subManifestData[0]?.submanifests?.length>0){
          fetchSubManifests(subManifestData)
        }
        else{
          setOptions(subManifestData)
          identifyEntities(subManifestData)
        }
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
      });
  }

  const fetchEntities = async(subManifest, manifestName)=>{
    fetchEntityPromises = []
    console.log(subManifest)
    for (const entity of subManifest.entities?subManifest.entities:subManifest) {
      console.log(entity)
      const url = `http://localhost:4000/schemaDocuments/${manifest}/${subManifest?.manifestName ? subManifest.manifestName.split(' CDM manifest')[0] : ''}/${entity.entityPath.split('/')[0]}`;
      console.log(url)
      const fetchPromise = fetch(url).then((response) => response.json());
      fetchEntityPromises.push(fetchPromise);
    }

    try {
      const entityData = await Promise.all(fetchEntityPromises);
      console.log(entityData)
      destructureEntites(entityData,manifestName?manifestName:subManifest.manifestName)
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }
  //gets all the entities/tables in the format [{},{}] where each objects represents one table within the manifest
  let fetchEntityPromises = [];
  const identifyEntities = async (subManifestData) => {
    
    console.log(subManifestData)
      if (subManifestData?.length>1){
        for (const subManifest of subManifestData) {
          fetchEntities(subManifest)
          
        }
      }
      
  };
  
  
  //Takes in the list of objects from fetch entities, destructures them and displays it on the screen
  const destructureEntites =(entityData, manifestName)=>{
    if (selected===manifestName){
      console.log(entityData)
    let entityName
    nodeDataArray = []
    entityData.map((entity=>{
      entity.definitions.map((definition=>{
        if (definition.entityName){
          entityName  = definition.entityName
          let items = []
          let inheriteditems = []
          definition.hasAttributes[0].attributeGroupReference.members.map((attribute=>{
            let primaryBool = attribute.purpose==true?true:false
            if(attribute.entity?.operations){
              attribute.entity?.operations.map((operation=>{
                if (operation.$type==="replaceAsForeignKey"){
                  let to;
                  if (attribute.entity.source?.entityReference){
                    to = attribute.entity.source?.entityReference.entityName
                  }
                  else{
                    to = attribute.entity.source
                  }
                  linkDataArray.push({ from: definition.entityName, to: to, text: "1", toText: "1" })
                  inheriteditems.push({ name: attribute.name, iskey: primaryBool })
                }
              }))
            }
            else{
              items.push({name:attribute.name, isKey: primaryBool})
            }
          
          
          }))
          // items.push({inheriteditems });
          let obj = {
            key:entityName, visibility:true, location: new go.Point(250,250),
            items,
            inheriteditems
          }
          nodeDataArray.push(obj)
        }
        
        
      }))
      
    }))
    myDiagram.model = new go.GraphLinksModel(
      {
      copiesArrays: true,
      copiesArrayObjects: true,
      nodeDataArray: nodeDataArray,
      linkDataArray: linkDataArray
      });
    }


  }
  
  
  
  
  
  
  useEffect(() => {
    // Initialize the diagram
    myDiagram = $(go.Diagram, 'myDiagramDiv', {
      allowDelete: false,
      allowCopy: false,
      'undoManager.isEnabled': true,
      layout: $(go.ForceDirectedLayout),
    });


    const itemTempl = $(
      go.Panel,
      'Horizontal',
      $(
        go.Shape,
        {
          desiredSize: new go.Size(15, 15),
          strokeJoin: 'round',
          strokeWidth: 3,
          margin: 2,
        },
        new go.Binding('figure', 'figure'),
        new go.Binding('fill', 'color'),
        new go.Binding('stroke', 'color')
      ),
      $(
        go.TextBlock,
        {
          font: '14px sans-serif',
          stroke: 'black',
        },
        new go.Binding('text', 'name'),
        new go.Binding('stroke', '', (n) => (myDiagram.model.modelData.darkMode ? '#f5f5f5' : '#000000'))
      )
    )
    
      
    // Define node templates, link templates, and model data here

    myDiagram.nodeTemplate =
    $(go.Node, "Auto",
      {
        selectionAdorned: true,
        resizable: true,
        layoutConditions: go.Part.LayoutStandard & ~go.Part.LayoutNodeSized,
        fromSpot: go.Spot.LeftRightSides,
        toSpot: go.Spot.LeftRightSides,
        isShadowed: true,
        shadowOffset: new go.Point(4, 4),
        shadowColor: "#919cab"
      },
      new go.Binding("location", "location").makeTwoWay(),
      // whenever the PanelExpanderButton changes the visible property of the "LIST" panel,
      // clear out any desiredSize set by the ResizingTool.
      new go.Binding("desiredSize", "visible", v => new go.Size(NaN, NaN)).ofObject("LIST"),
      // define the node's outer shape, which will surround the Table
      $(go.Shape, "RoundedRectangle",
        { stroke: "#e8f1ff", strokeWidth: 3 },
        new go.Binding("fill", "", n => (myDiagram.model.modelData.darkMode) ? "#4a4a4a" : "#f7f9fc")
      ),
      $(go.Panel, "Table",
        { margin: 8, stretch: go.GraphObject.Fill, width: 160 },
        $(go.RowColumnDefinition, { row: 0, sizing: go.RowColumnDefinition.None }),
        // the table header
        $(go.TextBlock,
          {
            row: 0, alignment: go.Spot.Center,
            margin: new go.Margin(0, 24, 0, 2),  // leave room for Button
            font: "bold 16px sans-serif"
          },
          new go.Binding("text", "key"),
          new go.Binding("stroke", "", n => (myDiagram.model.modelData.darkMode) ? "#d6d6d6" : "#000000")
        ),
        // the collapse/expand button
        $("PanelExpanderButton", "LIST",
          { row: 0, alignment: go.Spot.TopRight },
          new go.Binding("ButtonIcon.stroke", "", n => (myDiagram.model.modelData.darkMode) ? "#d6d6d6" : "#000000")
        ),
        // the list of Panels, each showing an attribute
        $(go.Panel, "Table",
          {
            name: "LIST",
            row: 1,
            padding: 3,
            alignment: go.Spot.TopLeft,
            defaultAlignment: go.Spot.Left,
            stretch: go.GraphObject.Horizontal,
            itemTemplate: itemTempl,
          }
        ),
        $(go.TextBlock,
          {
            font: "bold 15px sans-serif",
            text: "Attributes",
            row: 1,
            alignment: go.Spot.TopLeft,
            margin: new go.Margin(8, 0, 0, 0),
          },
          new go.Binding("stroke", "", n => (myDiagram.model.modelData.darkMode) ? "#d6d6d6" : "#000000")
        ),
        $("PanelExpanderButton", "NonInherited", // the name of the element whose visibility this button toggles
          { row: 1, column: 1 },
          new go.Binding("ButtonIcon.stroke", "", n => (myDiagram.model.modelData.darkMode) ? "#d6d6d6" : "#000000")
        ),
        $(go.Panel, "Vertical",
          {
            name: "NonInherited",
            alignment: go.Spot.TopLeft,
            defaultAlignment: go.Spot.Left,
            itemTemplate: itemTempl,
            row: 2
          },
          new go.Binding("itemArray", "items") // Display items array
        ),
  
        $(go.TextBlock,
          {
            font: "bold 15px sans-serif",
            text: "Foreign Keys",
            row: 3,
            alignment: go.Spot.TopLeft,
            margin: new go.Margin(8, 0, 0, 0),
          },
          new go.Binding("visible", "visibility", Boolean),
          new go.Binding("stroke", "", n => (myDiagram.model.modelData.darkMode) ? "#d6d6d6" : "#000000")
        ),
        $("PanelExpanderButton", "Inherited", // the name of the element whose visibility this button toggles
          {
            row: 3,
            column: 1,
          },
          new go.Binding("visible", "visibility", Boolean),
          new go.Binding("ButtonIcon.stroke", "", n => (myDiagram.model.modelData.darkMode) ? "#d6d6d6" : "#000000")
        ),
        $(go.Panel, "Vertical",
          {
            name: "Inherited",
            alignment: go.Spot.TopLeft,
            defaultAlignment: go.Spot.Left,
            itemTemplate: itemTempl,
            row: 4
          },
          new go.Binding("itemArray", "inheriteditems") // Display inheriteditems array
        )
      )
    );
  
    
    
    // var linkDataArray = [
    // { from: "Products", to: "Suppliers", text: "0..N", toText: "1" },
    // { from: "Products", to: "Categories", text: "0..N", toText: "1" },
    // { from: "Order Details", to: "Products", text: "0..N", toText: "1" },
    // { from: "Categories", to: "Suppliers", text: "0..N", toText: "1" }
    // ];

    fetch(
      `http://localhost:4000/schemaDocuments/${manifest}/${manifest}.manifest.cdm.json`
    )
      .then((response) => response.json())
      .then((jsonData) => {
        console.log(jsonData)
        if (jsonData?.subManifests?.length>0){
          fetchSubManifests(jsonData.subManifests)
        }
        else{
          fetchEntities(jsonData.entities,jsonData.manifestName)
          setOptions([{manifestName:jsonData.manifestName}])
          
        }
        
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
      });


    
    

    // ... Define other templates and model data for your ER Diagram ...
    
    // myDiagram.model = new go.GraphLinksModel(
    //         {
    //         copiesArrays: true,
    //         copiesArrayObjects: true,
    //         nodeDataArray: nodeDataArray,
    //         linkDataArray: linkDataArray
    //         });
    // myDiagram.model.modelData.darkMode = false;

    // When the component unmounts, make sure to clean up the diagram
    return () => {
      myDiagram.div = null;
    };
    
  }, [selected]);

  return (
    <div>
      <h1>Entity-Relationship Diagram</h1>
      
      {options.length>0?
      
      options.map((option=>{
      return(
      <label>
        <input
          type="checkbox"
          name={option.manifestName}
          checked={selected.includes(option.manifestName)}
          onClick={() => setSelected(option.manifestName)}/>
        {option.manifestName}
      </label>)
      })):null
    
    
    }
      <div id="myDiagramDiv" style={{ width: '100%', height: '1000px' }}></div>
    </div>
  );
};

export default ERD;
