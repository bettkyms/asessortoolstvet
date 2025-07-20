
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { ControlPanel } from './components/ControlPanel.tsx';
import { OutputDisplay } from './components/OutputDisplay.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { generatePracticalPaper, generateCuttingList, generateChecklist } from './services/geminiService.ts';
import { CandidatePracticalPaper, CuttingList, Checklist, KNQFLevel } from './types.ts';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [courseTitle, setCourseTitle] = useState<string>('ELECTRICAL INSTALLATION');
  const [module, setModule] = useState<string>('ENG/OS/EI/CR/03/3/MA');
  const [paperName, setPaperName] = useState<string>('Install Conduit System');
  const [curriculumElements, setCurriculumElements] = useState<string>(
    '- Identify Conduit Accessories\n- Prepare and Mount Conduit Work Pieces\n- Install Electrical Cables and Accessories\n- Perform Test and Inspection'
  );
  const [paperDescription, setPaperDescription] = useState<string>(
    'The assessment should be divided into three timed sections. The first section should test identification of tools and materials. The second should test a basic skill (e.g., making a joint). The final section must be a comprehensive task requiring the candidate to interpret a diagram/scenario, plan, execute the main task, and perform tests.'
  );
  const [knqfLevel, setKnqfLevel] = useState<KNQFLevel>(3);


  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [practicalPaper, setPracticalPaper] = useState<CandidatePracticalPaper | null>(null);
  const [cuttingList, setCuttingList] = useState<CuttingList | null>(null);
  const [checklist, setChecklist] = useState<Checklist | null>(null);


  const handleGeneratePaper = useCallback(async () => {
    if (!courseTitle || !module || !paperName || !curriculumElements) {
      setError('Please fill in all required fields.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setPracticalPaper(null);
    setCuttingList(null);
    setChecklist(null);

    try {
      const paperContent = await generatePracticalPaper(courseTitle, module, paperName, curriculumElements, paperDescription, knqfLevel);
      setPracticalPaper(paperContent);
    } catch (e) {
      console.error(e);
      setError('An error occurred while generating the practical paper. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [courseTitle, module, paperName, curriculumElements, paperDescription, knqfLevel]);

  const handleGenerateCuttingList = useCallback(async () => {
    if (!practicalPaper) return;
    
    setIsLoading(true);
    setError(null);
    try {
        const content = await generateCuttingList(practicalPaper, knqfLevel);
        setCuttingList(content);
    } catch (e) {
        console.error(e);
        setError('An error occurred while generating the cutting list. Please try again.');
    } finally {
        setIsLoading(false);
    }
  }, [practicalPaper, knqfLevel]);

  const handleGenerateChecklist = useCallback(async () => {
    if (!practicalPaper) return;

    setIsLoading(true);
    setError(null);
    try {
        const content = await generateChecklist(practicalPaper, knqfLevel);
        setChecklist(content);
    } catch (e) {
        console.error(e);
        setError('An error occurred while generating the checklist. Please try again.');
    } finally {
        setIsLoading(false);
    }
  }, [practicalPaper, knqfLevel]);
  
  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-100 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 xl:col-span-3">
            <ControlPanel
              courseTitle={courseTitle}
              setCourseTitle={setCourseTitle}
              module={module}
              setModule={setModule}
              paperName={paperName}
              setPaperName={setPaperName}
              curriculumElements={curriculumElements}
              setCurriculumElements={setCurriculumElements}
              paperDescription={paperDescription}
              setPaperDescription={setPaperDescription}
              knqfLevel={knqfLevel}
              setKnqfLevel={setKnqfLevel}
              onGenerate={handleGeneratePaper}
              isLoading={isLoading}
            />
          </div>
          <div className="lg:col-span-8 xl:col-span-9">
            <OutputDisplay
              practicalPaper={practicalPaper}
              cuttingList={cuttingList}
              checklist={checklist}
              isLoading={isLoading}
              error={error}
              onGenerateCuttingList={handleGenerateCuttingList}
              onGenerateChecklist={handleGenerateChecklist}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;