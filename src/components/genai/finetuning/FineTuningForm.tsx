import { useState } from "react";
import { useSession } from "@supabase/auth-helpers-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DatasetInput } from "./DatasetInput";
import { ModelSelect } from "./ModelSelect";
import { HyperParameters } from "./HyperParameters";

export const FineTuningForm = () => {
  const [selectedModel, setSelectedModel] = useState("");
  const [datasetType, setDatasetType] = useState("");
  const [taskType, setTaskType] = useState("");
  const [hyperparameters, setHyperparameters] = useState({
    learningRate: "0.0001",
    batchSize: "32",
    epochs: "10",
    warmupSteps: "500",
    weightDecay: "0.01",
    optimizerType: "adam",
    schedulerType: "linear",
    gradientClipping: "1.0",
    useEarlyStopping: true,
    validationSplit: "0.2",
    dropoutRate: "0.1"
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const session = useSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) {
      toast.error("Please login to continue");
      return;
    }

    if (!selectedModel || !datasetType || !taskType) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!selectedFile) {
      toast.error("Please upload a dataset file");
      return;
    }

    setIsGenerating(true);

    try {
      // Read file content for example data
      const fileContent = await selectedFile.text();
      const exampleData = fileContent.split('\n').slice(0, 5).join('\n'); // First 5 lines as example

      // Generate training script using OpenAI
      const { error: fnError, data } = await supabase.functions.invoke('generate-finetuning-script', {
        body: {
          modelName: selectedModel,
          datasetType,
          taskType,
          datasetDescription: `File type: ${selectedFile.type}, Size: ${selectedFile.size} bytes`,
          trainingExamples: exampleData,
          hyperparameters
        }
      });

      if (fnError) {
        throw new Error(`Failed to generate script: ${fnError.message}`);
      }

      // Store the generated script
      const { error: dbError } = await supabase
        .from('finetuning_jobs')
        .insert({
          user_id: session.user.id,
          model_name: selectedModel,
          dataset_type: datasetType,
          task_type: taskType,
          hyperparameters,
          colab_script: data.script,
          status: 'generated'
        });

      if (dbError) {
        throw new Error(`Failed to save script: ${dbError.message}`);
      }

      toast.success("Fine-tuning script generated successfully");
      
      // Reset form
      setSelectedModel("");
      setDatasetType("");
      setTaskType("");
      setSelectedFile(null);
      
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate fine-tuning script');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <ModelSelect
            value={selectedModel}
            onChange={setSelectedModel}
          />

          <DatasetInput
            datasetType={datasetType}
            setDatasetType={setDatasetType}
            taskType={taskType}
            setTaskType={setTaskType}
            onFileSelect={setSelectedFile}
          />

          <HyperParameters
            hyperparameters={hyperparameters}
            setHyperparameters={setHyperparameters}
          />

          <Button 
            type="submit" 
            className="w-full"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Script...
              </>
            ) : (
              'Generate Fine-tuning Script'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};