// Update your comfyui-implementation.js file with these additions for workflow support

export const COMFY_UI_CONFIG = {
  apiUrl: 'https://alzu4jgui9m6yz-8188.proxy.runpod.net/api',
  wsUrl: 'wss://alzu4jgui9m6yz-8188.proxy.runpod.net/ws',
  // Add any other configuration options you have
};

// Existing ComfyUI connection functions
let socket = null;
let clientId = null;

// Initialize the WebSocket connection to ComfyUI
export const checkComfyUIConnection = async () => {
  try {
    // First try to get ComfyUI status via a REST API call
    const response = await fetch(`${COMFY_UI_CONFIG.apiUrl}/system_stats`);
    
    if (!response.ok) {
      return { status: 'disconnected', error: 'Cannot reach ComfyUI API' };
    }

    // If the API is reachable, set up WebSocket
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      // Generate a unique client ID if not already created
      if (!clientId) {
        clientId = crypto.randomUUID();
      }

      socket = new WebSocket(`${COMFY_UI_CONFIG.wsUrl}?clientId=${clientId}`);
      
      // Wait for connection to open or fail
      await new Promise((resolve) => {
        socket.onopen = () => resolve(true);
        socket.onerror = () => resolve(false);
        
        // If nothing happens after 5 seconds, consider it a failure
        setTimeout(() => resolve(false), 5000);
      });
      
      if (socket.readyState !== WebSocket.OPEN) {
        return { status: 'disconnected', error: 'WebSocket connection failed' };
      }
    }
    
    return { status: 'connected' };
  } catch (error) {
    console.error('Error checking ComfyUI connection:', error);
    return { status: 'disconnected', error: error.message };
  }
};

// Close WebSocket connection
export const closeWebSocketConnection = () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close();
    socket = null;
  }
};

// Get available models from ComfyUI
export const getAvailableModels = async () => {
  try {
    const response = await fetch(`${COMFY_UI_CONFIG.apiUrl}/object_info`);
    
    if (!response.ok) {
      throw new Error('Failed to get model information');
    }
    
    const data = await response.json();
    
    // Extract checkpoints and samplers
    const checkpoints = data.CheckpointLoaderSimple?.input?.required?.ckpt_name?.options || [];
    const samplers = data.KSampler?.input?.required?.sampler_name?.options || [];
    
    return {
      checkpoints,
      samplers
    };
  } catch (error) {
    console.error('Error getting available models:', error);
    throw error;
  }
};

// Generate image function (existing)
export const generateImage = async (options) => {
  const { 
    prompt, 
    negativePrompt = '', 
    model, 
    sampler = 'euler_ancestral', 
    steps = 20, 
    cfgScale = 7.5,
    width = 512,
    height = 512,
    onProgress
  } = options;
  
  // Implementation for standard image generation
  // ...

  // Simulate a result for demonstration
  return {
    imageUrl: 'path/to/generated/image.png', 
    filename: 'generated-image.png'
  };
};

// NEW FUNCTIONS FOR WORKFLOW SUPPORT

// Get workflow history from ComfyUI
export const getWorkflowHistory = async () => {
  try {
    const response = await fetch(`${COMFY_UI_CONFIG.apiUrl}/history`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch workflow history: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching workflow history:', error);
    throw error;
  }
};

// Load a specific workflow from history by its ID
export const loadWorkflowById = async (workflowId) => {
  try {
    const response = await fetch(`${COMFY_UI_CONFIG.apiUrl}/history/${workflowId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load workflow: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error loading workflow:', error);
    throw error;
  }
};

// Find prompt nodes in a ComfyUI workflow
export const findPromptNodes = (workflow) => {
  if (!workflow || !workflow.nodes) {
    return { positive: null, negative: null };
  }
  
  const nodes = workflow.nodes;
  let positiveNode = null;
  let negativeNode = null;
  
  // Look for CLIP text encode nodes
  for (const node of nodes) {
    // Check if it's a text encode node
    if (node.type === "CLIPTextEncode") {
      // Check if this node has connections that might identify it as negative
      const isNegative = node.title?.toLowerCase().includes("negative") || 
                         node.inputs?.text?.toLowerCase().includes("negative");
      
      if (isNegative) {
        negativeNode = node;
      } else {
        positiveNode = node;
      }
    }
  }
  
  return { positive: positiveNode, negative: negativeNode };
};

// Generate image with an existing workflow, changing only the prompt
export const generateImageWithWorkflow = async (workflow, promptText, negativePromptText, options = {}) => {
  try {
    // Clone the workflow to avoid modifying the original
    const modifiedWorkflow = JSON.parse(JSON.stringify(workflow));
    
    // Find prompt nodes
    const { positive: positiveNode, negative: negativeNode } = findPromptNodes(modifiedWorkflow);
    
    // Update prompts if nodes found
    if (positiveNode && promptText) {
      positiveNode.inputs.text = promptText;
    }
    
    if (negativeNode && negativePromptText) {
      negativeNode.inputs.text = negativePromptText;
    }
    
    // Generate a unique client ID for this request
    const requestClientId = crypto.randomUUID();
    let localSocket = null;
    
    if (options.onProgress) {
      // Set up a new WebSocket for progress monitoring
      localSocket = new WebSocket(`${COMFY_UI_CONFIG.wsUrl}?clientId=${requestClientId}`);
      
      localSocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'progress') {
          options.onProgress(message.data);
        } else if (message.type === 'executed') {
          // Image is ready
          if (options.onComplete) {
            options.onComplete(message.data);
          }
        } else if (message.type === 'status') {
          // Status updates
          if (options.onStatus) {
            options.onStatus(message.data);
          }
        }
      };
      
      // Wait for socket to be open
      await new Promise((resolve) => {
        if (localSocket.readyState === WebSocket.OPEN) {
          resolve();
        } else {
          localSocket.onopen = resolve;
        }
      });
    }
    
    // Send the workflow to ComfyUI to execute
    const response = await fetch(`${COMFY_UI_CONFIG.apiUrl}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: modifiedWorkflow,
        client_id: requestClientId,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to execute workflow: ${response.statusText}`);
    }
    
    // Get the response which contains the execution ID
    const result = await response.json();
    
    // If no WebSocket, we need to poll for completion
    if (!localSocket && options.onComplete) {
      // Poll for output
      const checkOutput = async () => {
        try {
          const outputResponse = await fetch(`${COMFY_UI_CONFIG.apiUrl}/history/${result.prompt_id}`, {
            method: 'GET',
          });
          
          if (outputResponse.ok) {
            const outputData = await outputResponse.json();
            if (outputData.output) {
              options.onComplete(outputData);
              return;
            }
          }
          
          // Check again after a delay
          setTimeout(checkOutput, 1000);
        } catch (error) {
          console.error('Error checking output:', error);
        }
      };
      
      checkOutput();
    }
    
    return result;
  } catch (error) {
    console.error('Error generating with workflow:', error);
    throw error;
  }
};

// Process the output to get the image URL
export const getImageFromOutput = (output) => {
  if (!output || !output.outputs) return null;
  
  // Find image outputs
  for (const nodeId in output.outputs) {
    const nodeOutput = output.outputs[nodeId];
    // Look for image data
    for (const outputName in nodeOutput) {
      const outputData = nodeOutput[outputName];
      if (outputData.images && outputData.images.length > 0) {
        const image = outputData.images[0];
        return {
          imageUrl: `${COMFY_UI_CONFIG.apiUrl}/view?filename=${image.filename}&type=${image.type}`,
          filename: image.filename,
          type: image.type,
        };
      }
    }
  }
  
  return null;
};