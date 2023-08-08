import React, { useEffect, useState } from 'react';
import go from 'gojs';
import { json, useParams } from 'react-router-dom';
import {Md123} from "react-icons/md";
import MyReactButton from '../components/MyReactButton';


const ERD = () => {
  let {manifest} = useParams();
  manifest = (manifest.replace(/\s/g, ""));
  let nodeDataArray = []
  let linkDataArray = []
  const $ = go.GraphObject.make;
  let myDiagram;
  const [options,setOptions] = useState([])
  const [selected,setSelected] = useState([])

  let copies=[]
  
  function showMore(data) {
    console.log(data)
    if (data.selectedButtonKey === "Show Less" ) {
      // If the button says "Show Less", only display the first 5 items
      data.selectedButtonKey = "Show More"; // Toggle the button text
      data.items = data.items.slice(0, 5); // Keep only the first 5 items
      myDiagram.model.updateTargetBindings(data); 
    } 
    else {
      data.selectedButtonKey = "Show Less"; 
      const originalData = copies.flat().find(entity => entity.key === data.key);
      data.items = originalData.items
      myDiagram.model.updateTargetBindings(data);     }
  
    // Update the diagram
  }
  
  
  
  const fetchSubManifests = (subManifests) =>{
    const fetchPromises = subManifests.map((subManifest) =>
      fetch(`http://localhost:4000/schemaDocuments/${manifest}/${subManifest.definition}`)
        .then((response) => response.json(
        ))
    );

    Promise.all(fetchPromises)
      .then((subManifestData) => {
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
    for (const entity of subManifest.entities?subManifest.entities:subManifest) {
      const url = `http://localhost:4000/schemaDocuments/${manifest}/${subManifest?.manifestName ? subManifest.manifestName.split(' CDM manifest')[0] : ''}/${entity.entityPath.split('/')[0]}`;
      const fetchPromise = fetch(url).then((response) => response.json());
      fetchEntityPromises.push(fetchPromise);
    }

    try {
      const entityData = await Promise.all(fetchEntityPromises);
      destructureEntites(entityData,manifestName?manifestName:subManifest.manifestName)
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }
  //gets all the entities/tables in the format [{},{}] where each objects represents one table within the manifest
  let fetchEntityPromises = [];
  const identifyEntities = async (subManifestData) => {
    
      if (subManifestData?.length>1){
        for (const subManifest of subManifestData) {
          fetchEntities(subManifest)
          
        }
      }
      
  };
  
  
  //Takes in the list of objects from fetch entities, destructures them and displays it on the screen
  const destructureEntites =(entityData, manifestName)=>{
    if (selected===manifestName){
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
                  items.push({ name: attribute.name, iskey: primaryBool, fkey:true, dataType:attribute.dataType })
                }
              }))
            }
            else{
              items.push({name:attribute.name, isKey: primaryBool,fkey:false, dataType:attribute.dataType})
            }
          
          
          }))
          // items.push({inheriteditems });
          let limitedItems = items.slice(0, 5);
          let limitedobj = {
            key:entityName, visibility:true, location: new go.Point(250,250),
            items:limitedItems,
            inheriteditems
          }
          let fullobj= {
            key:entityName, visibility:true, location: new go.Point(250,250),
            items,
            inheriteditems
          }
          nodeDataArray.push(limitedobj)
          copies.push(fullobj)
          console.log(nodeDataArray)
        }
        
        
      }))
      
    }))

    
    }
    copies  = JSON.parse(JSON.stringify(copies))
    myDiagram.model = new go.GraphLinksModel(
      {
      copiesArrays: true,
      copiesArrayObjects: true,
      nodeDataArray: nodeDataArray,
      linkDataArray: linkDataArray
      });
    
    


  }
  
  
  
  
  
  
  useEffect(() => {
    // Initialize the diagram
    myDiagram = $(go.Diagram, 'myDiagramDiv', {
      allowDelete: false,
      allowCopy: true,
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
    // Define the node's outer shape, which will surround the Table
    $(go.Shape, "Rectangle",
      {
        stroke: "#e8f1ff",
        strokeWidth: 3,
        // Set the width and height of the rectangle node
        width: 280, 
      },
      new go.Binding("fill", "", n => (myDiagram.model.modelData.darkMode) ? "#4a4a4a" : "#f7f9fc")
    ),
    // ... Other node template code ...
  $(go.Panel, "Table",
    { margin: 8, stretch: go.GraphObject.Fill, width: 260 },
    $(go.RowColumnDefinition, { row: 0, sizing: go.RowColumnDefinition.None }),
    // the table header
    $(go.TextBlock,
      {
        row: 0, alignment: go.Spot.Center,
        margin: new go.Margin(0, 24, 0, 2),  // leave room for Button
        font: "bold 20px sans-serif",
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
        margin: new go.Margin(0, 0, 0, 8)
        
      }
    ),
    $(go.Shape, "LineH",  // Horizontal line shape
  {
    row: 0, // Place the line in row 2, which is below the "Attributes" section
    margin: new go.Margin(14, 0, 0, 0),
    width: 260, // Set the width of the line as needed
    strokeWidth: 1, // Set the line thickness as needed
    stroke: "#000000", // Set the line color
  }
),
    $(go.TextBlock,
      {
        font: "bold 15px sans-serif",
        text: "Attributes",
        row: 1,
        alignment: go.Spot.TopLeft,
        margin: new go.Margin(8, 0, 0, 0),
        width:200
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
    )),
    $(
      go.Panel,
      'Auto',
      {
        alignment: go.Spot.Bottom,
        alignmentFocus: go.Spot.Bottom,
        // margin: new go.Margin(0, 0, 2, 0),
      },
      $(
        go.TextBlock,
        {
          text: "", // The text will be set via Binding
          font: "bold 12px sans-serif",
          alignment: go.Spot.Center,
          alignmentFocus: go.Spot.Center,
          stroke: "black"
        },
        new go.Binding("text", "", function(object) {
          const originalData = copies.flat().find(entity => entity.key === object.part.data.key);
          if (originalData.items.length>5){
            return object.part.data.selectedButtonKey || "Show More";
          }
          else{
            return null
          }
          
        }).ofObject(),
      ),
      {
        click: (e, obj) => showMore(obj.part.data)
      }
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
  
    myDiagram.model.modelData.darkMode = false;

    // When the component unmounts, make sure to clean up the diagram
    return () => {
      myDiagram.div = null;
    };
    
  }, [selected]);

  return (
    <div className="erd-container">
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
