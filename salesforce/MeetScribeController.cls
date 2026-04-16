
public with sharing class MeetScribeController {
    
    private static final String PROCESS_NAME = 'MeetScribeController';
    private static final String GENAI_SOBJECT = 'GenAi_Logging__c';
    private static final String TASK_SOBJECT = 'Task';
    private static final String MeetScribe_RECORD_TYPE = 'CosmoConnect';
    private static final String CALL_ANALYTICS_RECORD_TYPE = 'Call_Analytics';
    private static final String PHONE_CALL_RECORD_TYPE = 'Phone_Call';
    private static final String CONTACT_PREFIX = '003';
    private static final Integer MIN_SEARCH_LENGTH = 2;
    private static final Integer MAX_SEARCH_RESULTS = 10;
    @TestVisible
    private static Boolean forceException = false;

    @AuraEnabled
    public static Id createMeetingRecord(Map<String, Object> meetingData) {
        try {
            if (meetingData == null || meetingData.isEmpty()) {
                throw Utilities.auraHandledExceptionCustom('Meeting data is required.');
            }
            validateGenAiCreateAccess();
            
            Id taskRecordId = createTaskRecord(meetingData);
            Id MeetScribeRecordTypeId = RecordTypeService.getIdBySObjectAndDeveloperName(GENAI_SOBJECT, MeetScribe_RECORD_TYPE);
            
            GenAi_Logging__c MeetScribeGenAiRecord = buildGenAiRecord(meetingData, MeetScribeRecordTypeId, null);
            insertRecord(MeetScribeGenAiRecord, 'createMeetingRecord');
            
            Id callAnalyticsRecordTypeId = RecordTypeService.getIdBySObjectAndDeveloperName(GENAI_SOBJECT, CALL_ANALYTICS_RECORD_TYPE);
            
            GenAi_Logging__c callAnalyticsGenAiRecord = buildGenAiRecord(meetingData, callAnalyticsRecordTypeId, taskRecordId);
            insertRecord(callAnalyticsGenAiRecord, 'createMeetingRecord');
            
            
            return MeetScribeGenAiRecord.Id;
        } catch (Exception ex) {
            logAndThrowException(ex, 'createMeetingRecord');
            return null;
        }
    }
    
    private static Id createTaskRecord(Map<String, Object> meetingData) {
        validateTaskCreateAccess();
        
        MeetingTimeWrapper timeWrapper = parseMeetingTimes(meetingData);
        Id participantId = (Id) meetingData.get('participantId');
        String meetingId = (String)meetingData.get('recordingId');
        Id recordTypeId = RecordTypeService.getIdBySObjectAndDeveloperName(TASK_SOBJECT, PHONE_CALL_RECORD_TYPE);
        
        Task taskRecord = buildTaskRecord(recordTypeId, participantId, timeWrapper, meetingId);
        insertRecord(taskRecord, 'createTaskRecord');
        
        return taskRecord.Id;
    }
    
    @AuraEnabled
    public static void sendEmail(Id recordId, List<String> emailAddresses, String subject, String meetingSummary) {
        if (emailAddresses == null || emailAddresses.isEmpty()) {
            throw new AuraHandledException(Label.MeetScribe_Email);
        }
        
        try {
            OrgWideEmailAddress orgWideEmail = [SELECT Id 
                                                FROM OrgWideEmailAddress 
                                                WHERE Address = :Label.MeetScribe_From_Address 
                                                WITH SECURITY_ENFORCED
                                                LIMIT 1];
            sendEmailMessage(emailAddresses, subject, meetingSummary, orgWideEmail);
            updateEmailRecord(recordId, emailAddresses, subject, meetingSummary);
            
        } catch (Exception ex) {
            logAndThrowException(ex, 'sendEmail');
        }
    }
    

    @AuraEnabled(cacheable=true)
    public static List<GenAi_Logging__c> getLogsByOwner() {
        try {
            Integer daysLimit = Integer.valueOf(Label.CosmoconnectHistoryDays);
            Date startDate = System.today().addDays(-daysLimit);
            Id recordTypeId = RecordTypeService.getIdBySObjectAndDeveloperName(GENAI_SOBJECT, COSMOCONNECT_RECORD_TYPE);
            
            return [SELECT Id, CreatedDate, Emails__c, Transcription__c,
                    Call_Summary__c, Owner.Name, Session_Title__c, Call_Recording_Id__c
                    FROM GenAi_Logging__c 
                    WHERE RecordType.Id = :recordTypeId 
                    AND OwnerId = :UserInfo.getUserId() 
                    AND CreatedDate >= :startDate
                    WITH SECURITY_ENFORCED
                    ORDER BY CreatedDate DESC];
        } catch (Exception ex) {
            logAndThrowException(ex, 'getLogsByOwner');
            return new List<GenAi_Logging__c>();
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static String getAudioUrl(String callRecordingId) {
        try {
            if (Test.isRunningTest() && forceException) {
                throw new CustomException(Label.Custom_Test_Failure_Message);
            }
            
            S3_File_Service_Config__mdt configDetails = AWS_S3_Service.getConfiguration('CosmoConnect_Recording_Download');
            AWS_S3_Service.setParameters(configDetails, callRecordingId);
            return AWS_S3_Service.getURLWithSignature();
            
        } catch (Exception ex) {
            logAndThrowException(ex, 'getAudioUrl');
            return null;
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static List<LookupSearchResult> searchContactsAndLeads(String searchKey) {
        try {
            if (String.isBlank(searchKey) || searchKey.length() < MIN_SEARCH_LENGTH) {
                return new List<LookupSearchResult>();
            }
            
            List<LookupSearchResult> results = new List<LookupSearchResult>();
            results.addAll(searchContacts(searchKey));
            results.addAll(searchLeads(searchKey));
            
            return results;
        } catch (Exception ex) {
            logAndThrowException(ex, 'searchContactsAndLeads');
            return new List<LookupSearchResult>();
        }
    }
    
    private static void validateGenAiCreateAccess() {
        if (!Schema.sObjectType.GenAi_Logging__c.isCreateable()) {
            throw Utilities.auraHandledExceptionCustom('Insufficient access to create GenAi_Logging__c.');
        }
        
        List<String> requiredFields = new List<String>{
            'Session_Title__c', 'Call_Summary__c', 'Call_Recording_Id__c', 
            'RecordTypeId', 'Task_Id__c', 'OwnerId'
        };
        
    }
    
    private static void validateTaskCreateAccess() {
        if (!Schema.sObjectType.Task.isCreateable()) {
            throw Utilities.auraHandledExceptionCustom('Insufficient access to create Task.');
        }
    }
    
    private static MeetingTimeWrapper parseMeetingTimes(Map<String, Object> meetingData) {
        MeetingTimeWrapper wrapper = new MeetingTimeWrapper();
        
        String startStr = String.valueOf(meetingData.get('callStartTime')).replace('T', ' ').substring(0, 19);
        String endStr = String.valueOf(meetingData.get('callEndTime')).replace('T', ' ').substring(0, 19);
        
        if (String.isNotBlank(startStr)) {
            System.debug('startStr '+startStr);
            wrapper.startTime= Datetime.valueOf(startStr);
        }
        if (String.isNotBlank(endStr)) {
            wrapper.endTime = Datetime.valueOfGmt(endStr);
        }
        
        return wrapper;
    }
    
    private static GenAi_Logging__c buildGenAiRecord(Map<String, Object> meetingData, Id recordTypeId, Id taskRecordId) {
        return new GenAi_Logging__c(
            Session_Title__c = (String) meetingData.get('meetingTitle'),
            Call_Summary__c = (String) meetingData.get('meetingSummary'),
            Call_Recording_Id__c = (String) meetingData.get('recordingId'),
            RecordTypeId = recordTypeId,
            Task_Id__c = taskRecordId,
            Task_Owner__c = UserInfo.getuserId(),
            OwnerId = UserInfo.getUserId()
        );
    }
    
    private static Task buildTaskRecord(Id recordTypeId, Id participantId, MeetingTimeWrapper timeWrapper, String meetingId) {
        return new Task(
            RecordTypeId = recordTypeId,
            Subject = 'CosmoConnect Call',
            Status = 'Open',
            Call_Due_Date__c = System.now(),
            Call_Type__c = 'CosmoConnect',
            WhoId = participantId,
            WhatId = getAccountIdFromParticipant(participantId),
            OwnerId = UserInfo.getUserId(),
            Call_Recording_Id__c = meetingId,
            Call_Start_Time__c = timeWrapper.startTime,
            Call_End_Time__c = timeWrapper.endTime
        );
    }
    
    private static void insertRecord(SObject record, String methodName) {
        Database.SaveResult saveResult = Database.insert(record, AccessLevel.USER_MODE);
        
        if (!saveResult.isSuccess()) {
            String errorMessage = saveResult.getErrors().isEmpty() 
                ? 'Insert failed' 
                : saveResult.getErrors()[0].getMessage();
            throw Utilities.auraHandledExceptionCustom(errorMessage);
        }
    }
    
    private static void sendEmailMessage(List<String> recipients, String subject, String htmlBody, OrgWideEmailAddress orgWideEmail) {
        Messaging.SingleEmailMessage emailMessage = new Messaging.SingleEmailMessage();
        emailMessage.setToAddresses(new List<String>(recipients));
        emailMessage.setSubject(subject);
        emailMessage.setHtmlBody(htmlBody);
        emailMessage.setSaveAsActivity(false);
        
        if (orgWideEmail != null) {
            emailMessage.setOrgWideEmailAddressId(orgWideEmail.Id);
        }
        
        List<Messaging.SendEmailResult> results = Messaging.sendEmail(
            new List<Messaging.SingleEmailMessage>{ emailMessage }, 
            false
        );
        
        for (Messaging.SendEmailResult result : results) {
            if (!result.isSuccess()) {
                System.debug(LoggingLevel.ERROR, 'Email send failed: ' + result.getErrors()[0].getMessage());
            }
        }
    }
   
    private static void updateEmailRecord(Id recordId, List<String> emailAddresses, 
                                          String callTitle, String callSummary) {
        String emailList = String.join(emailAddresses, ',');
        GenAi_Logging__c genAiRecord = new GenAi_Logging__c(
            Id = recordId, 
            Emails__c = emailList,
            Session_Title__c = callTitle,
            Call_Summary__c = callSummary
        );
        
        Database.SaveResult saveResult = Database.update(genAiRecord, AccessLevel.USER_MODE);
        
        if (!saveResult.isSuccess()) {
            String errorMessage = saveResult.getErrors().isEmpty() 
                ? 'Update failed' 
                : saveResult.getErrors()[0].getMessage();
            throw Utilities.auraHandledExceptionCustom(errorMessage);
        }
    }
    
    private static List<LookupSearchResult> searchContacts(String searchKey) {
        List<LookupSearchResult> results = new List<LookupSearchResult>();
        List<Contact> contacts = [
            SELECT Id, Email, Phone, FirstName, LastName, Account.Name
            FROM Contact 
            WHERE Email = :searchKey OR Phone = :searchKey  
            WITH SECURITY_ENFORCED
            LIMIT :MAX_SEARCH_RESULTS
        ];
        
        for (Contact con : contacts) {
            String subtitle = buildContactSubtitle(con);
            String fullName = buildFullName(con.FirstName, con.LastName);
            results.add(new LookupSearchResult(con.Id, 'Contact', 'standard:contact', fullName, subtitle));
        }
        return results;
    }
    
    private static List<LookupSearchResult> searchLeads(String searchKey) {
        List<LookupSearchResult> results = new List<LookupSearchResult>();
        List<Lead> leads = [SELECT Id, Email, Phone, FirstName, LastName, Company
                            FROM Lead 
                            WHERE (Email = :searchKey OR Phone = :searchKey) 
                            AND IsConverted = false
                            WITH SECURITY_ENFORCED
                            LIMIT :MAX_SEARCH_RESULTS];
        for (Lead ld : leads) {
            String subtitle = buildLeadSubtitle(ld);
            String fullName = buildFullName(ld.FirstName, ld.LastName);
            results.add(new LookupSearchResult(ld.Id, 'Lead', 'standard:lead', fullName, subtitle));
        }
        return results;
    }
    
    private static String buildContactSubtitle(Contact con) {
        String subtitle = '';
        if (String.isNotBlank(con.Account?.Name)) {
            subtitle = con.Account.Name;
        }
        if (String.isNotBlank(con.Email)) {
            subtitle += String.isNotBlank(subtitle) ? ' • ' + con.Email : con.Email;
        }
        return subtitle;
    }
    
    private static String buildLeadSubtitle(Lead ld) {
        String subtitle = '';
        if (String.isNotBlank(ld.Company)) {
            subtitle = ld.Company;
        }
        if (String.isNotBlank(ld.Email)) {
            subtitle += String.isNotBlank(subtitle) ? ' • ' + ld.Email : ld.Email;
        }
        return subtitle;
    }
    
    private static String buildFullName(String firstName, String lastName) {
        String fullName = '';
        if (String.isNotBlank(firstName)) {
            fullName = firstName;
        }
        if (String.isNotBlank(lastName)) {
            fullName += String.isNotBlank(fullName) ? ' ' + lastName : lastName;
        }
        return fullName;
    }
    
    private static Id getAccountIdFromParticipant(Id participantId) {
        if (participantId == null) {
            return null;
        }
        try {
            String participantIdStr = String.valueOf(participantId);
            if (participantIdStr.startsWith(CONTACT_PREFIX)) {
                Contact con = [SELECT Id, AccountId 
                               FROM Contact 
                               WHERE Id = :participantId 
                               WITH SECURITY_ENFORCED
                               LIMIT 1];
                return con.AccountId;
            }
            return null;
        } catch (Exception ex) {
            Log.log(ex);
            return null;
        }
    }
    
    private static void logAndThrowException(Exception ex, String methodName) {
        Log__c logInstance = new Log__c(
            Process_Name__c = PROCESS_NAME,
            Process_Step__c = methodName
        );
        Log.log(ex, logInstance, true);
        throw Utilities.auraHandledExceptionCustom(ex.getMessage());
    }
    
    private class MeetingTimeWrapper {
        public Datetime startTime { get; set; }
        public Datetime endTime { get; set; }
    }
    
    public class LookupSearchResult {
        @AuraEnabled public String id { get; set; }
        @AuraEnabled public String sObjectType { get; set; }
        @AuraEnabled public String icon { get; set; }
        @AuraEnabled public String title { get; set; }
        @AuraEnabled public String subtitle { get; set; }
        
        public LookupSearchResult(String id, String sObjectType, String icon, String title, String subtitle) {
            this.id = id;
            this.sObjectType = sObjectType;
            this.icon = icon;
            this.title = title;
            this.subtitle = subtitle;
        }
    }
}
