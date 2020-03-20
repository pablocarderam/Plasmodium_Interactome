
/**
 * Code for Plasmodium Interactome Map using sigma.js
 * made by Pablo Cardenas based on sigma.js example code
 */

/**** Global methods ****/

/**
* Shortcut for get element by ID
*/
var _ = {
 $: function (id) {
   return document.getElementById(id);
 },
};

/**
 * Returns Object with elements in array as keys and arrays of indexes of
 * occurrences of elements in array as values
 * https://monkeyraptor.johanpaul.net/2015/05/javascript-counting-same-occurrences-in.html
 */
var occurrence = function (array) {
   "use strict";
   var result = {};
   if (array instanceof Array) { // Check if input is array.
       array.forEach(function (v, i) {
           if (!result[v]) { // Initial object property creation.
               result[v] = [i]; // Create an array for that property.
           } else { // Same occurrences found.
               result[v].push(i); // Fill the array.
           }
       });
   }
   return result;
};

/**** Global vars and constants ****/
var scroll_list_ui = _.$('scroll-list'); // ui element to show list on
var gene_name_ui = _.$('gene-name'); // ui gene name title element
var neighbor_list = []; // contains array with a node's neighbors' ids for displaying
var term_list = []; // contains array with a node's terms for displaying

const NEIGHBORS = false; // constant value for list view mode
const TERMS = true; // constant value for list view mode
var list_view_mode = NEIGHBORS; // current view mode for list

/**** sigma.js methods and rendering ****/

/**
 * Add a method to the graph model that returns an
 * object with every neighbor of a node inside.
 * Keys are IDs, values are nodes.
 * Taken from sigma.js example code.
 */
sigma.classes.graph.addMethod('neighbors', function(nodeId) {
  var k,
      neighbors = {},
      index = this.allNeighborsIndex[nodeId] || {};

  for (k in index)
    neighbors[k] = this.nodesIndex[k];

  return neighbors;
});

/**
 * Main renderer call
 */
sigma.parsers.json(

  // First we import the data from a json file:

  './dat/plasmodium_interactome.json', // first argument is data filepath

  // Second argument is settings
  {
    container: 'sigma-container',
    settings: {
      labelThreshold: 1000,
      minNodeSize: 0.8,
      maxNodeSize: 3.5,
      enableHovering: true,
      defaultEdgeColor: 'rgba(50,50,50,0.1)',
      defaultNodeColor: 'rgba(155,5,0,0.1)', // this is overruled with new color scheme in json
      edgeColor: 'default',
      batchEdgesDrawing: true, // splits rendering across frames for performance
      hideEdgesOnMove: true // for performance
    }
  },

  /**
   * Third argument is main renderer function
   */
  function(s) {
    // We first need to save the original colors AND SIZE of our
    // nodes and edges, like this:
    s.graph.nodes().forEach(function(n) {
      n.originalColor = n.color;
      n.originalSize = n.size;
    });
    s.graph.edges().forEach(function(e) {
      e.originalColor = e.color;
    });

    // Now we add methods to the UI:

    /**
     * Selects a node by given ID
     */
    function selectNode(nodeId) {

      var terms = []; // contain all terms
      neighbor_list = []; // reset neighbors list
      term_list = []; // reset terms list

      var description = ""; // stores description of selected gene

      var toKeep = s.graph.neighbors(nodeId); // object contains nodes to render as neighbors
      toKeep[nodeId] = s.graph.nodes(nodeId); // add selected node as one of the ones to be rendered

      var g_sel = { // new graph to draw on top--this is an Object
        nodes: [],
        // Some nodes are being redrawn, which means all their edges must be as well.
        // For readability, we want to draw direct edges on top of everything
        // else, followed by edges between neighbors, followed by edges from
        // neighbors. Therefore, we have three tiers of edges:
        edges_1: [], // 1 neighbor
        edges_2: [], // 2 neighbors
        edges_direct: [] // direct connection
      };

      // We loop across all edges in graph:
      s.graph.edges().forEach(function(e) {
        if (e.source == nodeId || e.target == nodeId) { // if touching the selected node being redrawn
          g_sel.edges_direct.push(e); // add to new graph as a direct connection
          e.color = '#56B4E9'; // make blue!
        }
        else if (toKeep[e.source] && toKeep[e.target]) {// if touching 2 of the nodes being redrawn
          g_sel.edges_2.push(e); // add to new graph
          e.color = e.originalColor; // make this edge have its original color
        }
        else if (toKeep[e.source] || toKeep[e.target]) { // if touching one of the nodes being redrawn
          g_sel.edges_1.push(e); // add to new graph as an edge
          e.color = '#eee'; // otherwise make it light gray
        }
        else
          e.color = '#eee'; // otherwise make it light gray
      });

      // We loop across all nodes in graph:
      s.graph.nodes().forEach(function(n) {
        if (toKeep[n.id]) { // if this is the selected node or one of its neighbors,
          n.color = n.originalColor; // set it to its original color
          n.size = n.originalSize; // set to original size
          if (n.id == nodeId) { // if selected node
            // n.color = '#ff9e00';
              // we were changing the selected node's color before the new color scheme but now that's just silly
            n.size = n.originalSize*3; // make it larger than the others! Actually rescales others in sigma.js

            var label_txt_arr = n.label.split(': '); // search for delimiter between ID and explanation
            if (label_txt_arr.length > 1) // if label was split into two,
              description = label_txt_arr[1]; // store explanation for subtitle to gene ID
          }
          else // if not selected node,
            neighbor_list.push(n.id); // add node to neighbor list

          terms = terms.concat( n.label.split(/[^A-Za-z0-9]/) );
            // splits label by non-alphabetic, non-numeric characters and adds them onto the terms array

          g_sel.nodes.push(n); // add node to new graph
          s.graph.dropNode(n.id); // remove from current graph
        }
        else // if not a neighbor or selected node,
          n.color = '#eee'; // grey it out
      });

      for (var i = 0; i < g_sel.nodes.length; i++) { // re-add nodes
        s.graph.addNode(g_sel.nodes[i]);
      }
      for (var i = 0; i < g_sel.edges_1.length; i++) { // re-add edges with one neighbor
        s.graph.addEdge(g_sel.edges_1[i]);
      }
      for (var i = 0; i < g_sel.edges_2.length; i++) { // re-add edges with two neighbors
        s.graph.addEdge(g_sel.edges_2[i]);
      }
      for (var i = 0; i < g_sel.edges_direct.length; i++) { // re-add edges connected to selected node
        s.graph.addEdge(g_sel.edges_direct[i]);
      }

      var occ_arr = occurrence(terms); // Object with information of terms and their occurrences among neighbors

      for (let key in occ_arr) { // this syntax allows us to loop through Object
         if (occ_arr.hasOwnProperty(key)) { // same
            if (key.length > 1 && key !== "PF3D7") { // if term longer than 1 character and not PF3D7 (in most genes),
              term_list.push( '(' + occ_arr[key].length + ') ' + key );
                // add this term and the number of times it occurs to the list
            }
         }
      }

      term_list = term_list.sort( // now we'll sort the list according to descending numer of occurrences
        function(a, b){ // this function compares two elements by extracting the number of occurrences from each term string
          return Number( b.substring( 1,b.search( '\\)' ) ) ) - Number( a.substring( 1,a.search( '\\)' ) ) )
        }
      );

      if (list_view_mode == NEIGHBORS) { // if we're viewing neighbors,
        showNeighborList(neighbor_list); // show neighbors
      }
      else { // if we're viewing terms,
        showTermList(term_list); // show terms
      }

      gene_name_ui.innerHTML = ""; // wipe last gene ID
      var genes_in_id = nodeId.split(/,|;/) // split node ID by commas or colons (some nodes have multiple genes)
      for (var i = 0; i < genes_in_id.length; i++) { // for every gene ID in this node,
        gene_name_ui.innerHTML = gene_name_ui.innerHTML + genes_in_id[i] + ' <a href="https://plasmodb.org/plasmo/app/record/gene/' + genes_in_id[i] + '" target="_blank">(PlasmoDB)</a><br>';
          // set gene name element in ui with a link to PlasmoDB
      }
      gene_name_ui.innerHTML = gene_name_ui.innerHTML + '<br>' + description; // show explanation as subtitle to gene ID

      // Since the data has been modified, we need to
      // call the refresh method to make the colors
      // update effective.
      s.refresh();
    }

    /**
     * Searches for a gene with a given ID
     */
    function searchGene(e) {
      var exact_match = ""; // track if node found exactly
      var close_match = ""; // track if node found with partial match in name

      s.graph.nodes().forEach(function(n) { // loop over all nodes
        if (n.id === _.$('gene_id').value) { // if exact match found,
          exact_match = n.id; // record it
          close_match = n.id; // also set close match
        }
        else if ( n.id.search( _.$('gene_id').value ) > -1 ) { // if a close match found
          close_match = n.id; // record it
        }
      });

      if (close_match.length < 1) { // if no matches were found at all,
        gene_name_ui.innerHTML = "gene not found"; // say so in UI
      }
      else { // if matches found,
        if (exact_match.length > 0) // if match is exact,
          selectNode(exact_match); // use that match
        else // if not exact match,
          selectNode(close_match); // use close match
      }
    }

    /**
     * Selects a gene when clicked on in the neighbor list
     */
    function goToGene(e) {
      selectNode(e.currentTarget.innerHTML); // select based on which one was clicked
    }

    /**
     * Show list of neighbors in UI
     */
    function showNeighborList() {
      scroll_list_ui.innerHTML = ""; // reset list contents
      for (var i = 0; i < neighbor_list.length; i++) { // loop over list of neighbors
          scroll_list_ui.innerHTML = scroll_list_ui.innerHTML + '<span class="gene-list-item" id="' + neighbor_list[i] + '">' + neighbor_list[i] + '</span><br>';
            // add this neighbor to list in UI
      }

      // To add event listeners, we need this funny syntax because of weird JS workings:
      var list_items = document.querySelectorAll(".gene-list-item"); // get all list items
      list_items.forEach((gene, i) => { // apply the following to each list item:
        gene.addEventListener("click", goToGene); // add an event listener
      });
    }

    /**
     * Show list of neighborhood terms in UI
     */
    function showTermList() {
      scroll_list_ui.innerHTML = ""; // reset list contents
      for (var i = 0; i < term_list.length; i++) { // loop over list of terms
          scroll_list_ui.innerHTML = scroll_list_ui.innerHTML + term_list[i] + '<br>';
            // add term to list in UI
      }
    }

    /**
     * Set what the list in UI should display
     */
    function setListViewMode(e) {
      if (e.currentTarget.innerHTML === "associated terms" || e.currentTarget.innerHTML === "<u>associated terms</u>") {
        // if terms clicked,
        list_view_mode = TERMS; // set to show terms
        showTermList(); // show list of terms
        _.$('neighbors_btn').innerHTML = 'neighbors'; // make sure neighbors is not underlined
        _.$('terms_btn').innerHTML = '<u>associated terms</u>'; // underline terms
      }
      else {// otherwise if neighbors clicked,
        list_view_mode = NEIGHBORS; // set to show neighbors
        showNeighborList(); // show list of neighbors
        _.$('neighbors_btn').innerHTML = '<u>neighbors</u>'; // underline neighbors
        _.$('terms_btn').innerHTML = 'associated terms'; // make sure terms isn't underlined
      }
    }

    // Now we need to associate functions to user events:

    // First we'll add the select node function to its events:

    // When a node is clicked, we check for each node
    // if it is a neighbor of the clicked one. If not,
    // we set its color as grey, and else, it takes its
    // original color.
    // We do the same for the edges, and we only keep
    // edges that have both extremities colored.
    s.bind('clickNode', function(e) {
      var nodeId = e.data.node.id;
      selectNode(nodeId);
    });

    // When the stage is clicked, we just color each
    // node and edge with its original color.
    s.bind('clickStage', function(e) {
      s.graph.nodes().forEach(function(n) {
        n.color = n.originalColor;
        n.size = n.originalSize; // set back to original size
        scroll_list_ui.innerHTML = ""; // reset display list
        gene_name_ui.innerHTML = "search or click a gene"; // reset gene id indicator
      });

      s.graph.edges().forEach(function(e) { // for every edge,
        e.color = e.originalColor; // reset color
      });

      // Same as in the previous event:
      s.refresh();
    });

    // Next, add listeners for the buttons on the UI:
    _.$('search_btn').addEventListener("click", searchGene);
    _.$('neighbors_btn').addEventListener("click",setListViewMode);
    _.$('terms_btn').addEventListener("click",setListViewMode);
  }
);
