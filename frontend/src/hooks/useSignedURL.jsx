/**
 * Generates Signed URL for downloadable reports
 */

import { useQuery } from "@tanstack/react-query";
import StorageService from 'src/services/storage_services';

const getSignedURL = async (wf_id, job_id, document) => {  
   const storage = new StorageService(); 
   let jsonUrl, excelUrl;
   try {
                                   
       const jsonresp = await storage.genSignedURL(`output/${wf_id}/${job_id}/${document}.json`, false);
       const excelresp = await storage.genSignedURL(`output/${wf_id}/${job_id}/${document}-report.xlsx`, false);
       
       jsonUrl = jsonresp?.url || undefined;
       excelUrl = excelresp?.url || undefined;
       
   } catch (error) {        
       throw error;
   }

   return { jsonUrl, excelUrl };
};

export function useSignedURL(querykey, wf_id, job_id, document) {  
  return useQuery({
    queryKey: [querykey, wf_id, job_id, document],
    queryFn: () => getSignedURL(wf_id, job_id, document),
    refetchOnWindowFocus: false,
    cacheTime: 0
  });
}
