import React,{Component} from 'react';
import { StyleSheet, Text, View,TextInput, Alert,KeyboardAvoidingView ,TouchableOpacity, ScrollView,FlatList,TouchableHighlight,Image} from 'react-native';
import Myheader from '../components/myheader';
import firebase from 'firebase';
import db from '../config';
import {BookSearch} from 'react-native-google-books'
import {SearchBar,ListItem} from 'react-native-elements';


export default class Bookrequest extends Component {
  constructor(){
    super();
    this.state={
      userid:firebase.auth().currentUser.email,
      bookname:'',
      reason:'',
      isbookrequestactive:'',
      requestedbookname:'',
      bookstatus:'',
      requestid:'',
      userdocid:'',
      docid:'',
      datasource:'',
      showFlatlist:false,
      imagelink:''
    }
  }
  createuniqueid(){
    return Math.random().toString(36).substring(7)
  }
  addrequest =async(bookname,reason)=>{
       var userid = this.state.userid
    var requestid = this.createuniqueid()
    var books = await BookSearch.searchbook(bookname,'AIzaSyANTjn_Rh9d9X8X6K-0Ii5wNgAqffP3mSE')

    db.collection('requestbooks').add({"userid":userid,
    "bookname":bookname,"reason":reason,
    "requestid":requestid,"bookstatus":"requested","date":firebase.firestore.FieldValue.serverTimestamp(),
  "imagelink":books.data[0].volumeInfo.imageLinks.smallThumbnail})

  await this.getbookrequest()
  db.collection('users').where("emailid","==",userid).get().
  then().then((snapshot)=>{
    snapshot.forEach((doc)=>{db.collection('users').doc(doc.id).update({
      isbookrequestactive:true
    })
  })
})
  this.setState({
    bookname:'',
    reason:'',
    requestid:requestid
  })  
  return Alert.alert("book requested successfully")
}
  
recivebooks=(bookname)=>{
  var userid = this.state.userid
  var requestid = this.state.requestid
  db.collection('recievebooks').add({"userid":userid,"bookname":bookname,"requestid":requestid,"bookstatus":"recieved"})
}

getisbookrequestactive(){
  db.collection('users').where("emailid","==",this.state.userid)
  .onSnapshot(querySnapshot=>{querySnapshot.forEach(doc=>{
    this.setState({isbookrequestactive:doc.data().isbookrequestactive,userdocid:doc.id})
  })})
}
getbookrequest =()=>{
  var bookrequest = db.collection('requestbooks').
  where('userid','==',this.state.userid).get()
  .then((snapshot)=>{snapshot.forEach((doc)=>{
    if(doc.data().bookstatus !== "recieved"){this.setState({
      requestid:doc.data().requestid,requestedbookname:doc.data().bookname,bookstatus:doc.data().bookstatus,docid:doc.id
    })
  }
     
  })
  })}
  sendnotification=()=>{
    db.collection('users').where('emailid','==',this.state.userid).get().then((snapshot)=>{
      snapshot.forEach((doc)=>{
        var name = doc.data().firstname
        var lastname = doc.data().lastname;
        db.collection('allnotifications').where('requestid','==',this.state.requestid).get().then((snapshot)=>{
          snapshot.forEach((doc)=>{
            var donorid = doc.data().donorid;
            var bookname = doc.data().bookname
            db.collection('allnotifications').add({
              targeteduserid:donorid,
              'message':name+" " +lastname+ "recieved the book"+ bookname,
              "notificationstatus":"unread",
              'bookname':bookname
            })
          })
        })
      })
    })
  }
  componentDidMount(){
    this.getbookrequest();
    this.getisbookrequestactive();
  }
  updateBookRequestStatus=()=>{
    //updating the book status after receiving the book
    db.collection('requestbooks').doc(this.state.docid)
    .update({
      bookstatus : 'recieved'
    })
  
    //getting the  doc id to update the users doc
    db.collection('users').where('emailid','==',this.state.userid).get()
    .then((snapshot)=>{
      snapshot.forEach((doc) => {
        //updating the doc
        db.collection('users').doc(doc.id).update({
        isbookrequestactive:false
        })
      })
    })
  
  
  }

  async getbooksfromapi(bookname){
    this.setState({bookname:bookname})
    if(bookname.length > 2){
      var book = await BookSearch.searchbook(bookname,'AIzaSyANTjn_Rh9d9X8X6K-0Ii5wNgAqffP3mSE')
      this.setState({
        datasource:book.data,
        showFlatlist:true
      })
    }
  }

  renderItem = ({item,i})=>{
    let obj ={
      title:item.volumeInfo.title,
      selfLink: item.selfLink,
      buyLink: item.saleInfo.buyLink,
      imageLink:item.volumeInfo.imageLinks
    }
    return(
      <TouchableHighlight style = {{ alignItems: "center",
      backgroundColor: "#DDDDDD",
      padding: 10,
  
      width: '90%',}}
      activeOpacity={0.7}
      underlayColor="#DDDDDD"
      onPress={()=>{
        this.setState({showFlatlist:false,bookname:item.volumeInfo.title})
      }}bottomDivider>
        <Text>{item.volumeInfo.title}</Text>
      </TouchableHighlight>
    )
  }
  








  render(){
    if(this.state.isbookrequestactive===true){
    return (
      <View style ={{flex:1,justifyContent:'center'}}>
        <View style ={{borderColor:'orange',justifyContent :'center',borderWidth:2,alignItems:'center'}}>
          <Text>bookname</Text>
          <Text>{this.state.requestedbookname}</Text>
        </View>
        <View style ={{borderColor:'orange',justifyContent :'center',borderWidth:2,alignItems:'center'}}>
          <Text>bookstatus</Text>
          <Text>{this.state.bookstatus}</Text>
        </View>
        <TouchableOpacity style={{borderWidth:1,borderColor:'orange',backgroundColor:"orange",width:300,alignSelf:'center',alignItems:'center',height:30,marginTop:30}}
onPress={()=>{
  this.sendnotification();
  this.updateBookRequestStatus();
  this.recivebooks(this.state.requestedbookname)
}}>
  <Text>I recieved the book</Text>
</TouchableOpacity>
      </View>
    )
}
else{

return(
      <View style={{flex:1}}>
        <Myheader title="request book" navigation ={this.props.navigation}/>
          <TextInput style = {styles.formTextInput} 
           placeholder={"enter book name"}
           onChangeText={text => this.getbooksfromapi(text)}
           onClear={text => this.getbooksfromapi('')}
           value={this.state.bookname}/>

          {this.state.showFlatlist?(
          < Flatlist data = {this.state.datasource}
           renderItem = {this.renderItem}
          enableEmptySections ={true}
          style = {{marginTop:10}}
          keyExtractor = {(item,index)=>index.toString()}
          />):(<View style = {{alignItems:"center"}}>
          <TextInput style = {[styles.formTextInput,{height:100}]}
          placeholder ={"why you need the book?"}
          multiline
          numberOfLines={10}
          onChangeText = {(text)=>{
            this.setState({reason:text})
          }}
          value={this.state.reason}/>
          <TouchableOpacity styles = {styles.button}
          onPress={()=>
            {this.addrequest(this.state.bookname,this.state.reason)}}>
              <Text>Request</Text>
          </TouchableOpacity>
          </View>)}
          </View>
    );
  }
  }
}


const styles=StyleSheet.create({ formTextInput:{ width:"75%", height:35, alignSelf:'center', borderColor:'#ffab91', borderRadius:10, borderWidth:1, marginTop:20, padding:10, }, button:{ width:"75%", height:"50%", justifyContent:'center', alignItems:'center', borderRadius:10, backgroundColor:"#ff5722", shadowColor:"#000", shadowOffset:{ width:0, height:8, }, shadowOpacity:0.44, shadowRadius:10.32, elevation:16, marginTop:20 }, })
